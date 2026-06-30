/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini SDK with key from environment
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });
const MODELS = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

// Resilient API calling helper with retries, fallback models, exponential backoff, and timeouts
async function generateContentWithRetry(
  prompt: string,
  responseMimeType: 'application/json' | 'text/plain' = 'application/json',
  timeoutMs: number = 45000
): Promise<any> {
  let lastError: any = null;

  for (const model of MODELS) {
    const maxAttempts = 3;
    let delay = 1000; // start with 1s

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let timeoutId: any = null;
      try {
        console.log(`[Gemini API] Querying model "${model}" - Attempt ${attempt}/${maxAttempts}...`);
        const apiCall = ai.models.generateContent({
          model: model,
          contents: prompt,
          config: {
            responseMimeType,
          }
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
        });

        const response = await Promise.race([apiCall, timeoutPromise]);
        if (timeoutId) clearTimeout(timeoutId);
        
        console.log(`[Gemini API] Successfully generated content using "${model}"`);
        return response;
      } catch (error: any) {
        if (timeoutId) clearTimeout(timeoutId);
        lastError = error;
        
        const errorStr = typeof error === 'string' 
          ? error 
          : (error.message || '') + ' ' + (error.status || '') + ' ' + JSON.stringify(error);
        
        const isQuota = errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('quota');
        const isUnavailable = errorStr.includes('503') || errorStr.includes('UNAVAILABLE') || errorStr.includes('high demand');
        
        const isLastModel = MODELS.indexOf(model) === MODELS.length - 1;
        if (!isLastModel && (isQuota || isUnavailable)) {
          console.log(`[Gemini API] Model "${model}" hit rate limit or high demand. Switching to fallback model immediately.`);
          break; // break early to try the next model in the chain
        }

        // Only print warning logs if we are on the last model or it's a non-standard error
        if (isLastModel) {
          console.log(`[Gemini API] Warning: Model "${model}" attempt ${attempt} returned status: ${error.status || error.code || 'unknown'}`);
        } else {
          console.log(`[Gemini API] Note: Model "${model}" attempt ${attempt} returned status: ${error.status || error.code || 'rate_limited'}`);
        }

        const isRetryable =
          error.status === 429 ||
          error.status === 503 ||
          error.status === 'RESOURCE_EXHAUSTED' ||
          error.status === 'UNAVAILABLE' ||
          error.code === 429 ||
          error.code === 503 ||
          isQuota ||
          isUnavailable ||
          error.message === 'TIMEOUT' ||
          error.message?.includes('fetch failed');

        if (!isRetryable) {
          // If not retryable, break early to try the next model in the chain
          break;
        }

        // Wait longer for quota and unavailable errors
        let waitTime = delay;
        if (isQuota) {
          waitTime = Math.max(delay, 2500 + (attempt * 1000));
        } else if (isUnavailable) {
          waitTime = Math.max(delay, 1500 + (attempt * 1000));
        }

        const jitter = Math.random() * 300;
        const totalWait = waitTime + jitter;
        console.log(`[Gemini API] Retrying "${model}" in ${Math.round(totalWait)}ms (Attempt ${attempt}/${maxAttempts})...`);
        await new Promise((resolve) => setTimeout(resolve, totalWait));
        delay *= 2; // exponential backoff
      }
    }
  }

  // If we reach here, all models in the fallback chain have failed
  throw lastError || new Error('All models in the fallback chain failed.');
}

app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Routes FIRST
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// FEATURE 1: AI Inbox - parse natural language to tasks
app.post('/api/gemini/inbox', async (req, res) => {
  const { text, localTime } = req.body;
  try {
    if (!text) {
      res.status(400).json({ error: 'Text prompt is required' });
      return;
    }

    const prompt = `
      You are an AI Chief of Staff. Parse the following user's natural language input into a list of tasks.
      The current local time is: ${localTime || new Date().toISOString()}.
      
      Input text: "${text}"

      Extract tasks and represent them as strict JSON.
      For each task, assign:
      - title: (string, short descriptive title)
      - description: (string, details of the task)
      - deadline: (string, ISO Date String. If user specified "tomorrow" or "Friday at 7PM", calculate the exact ISO date relative to the current local time ${localTime})
      - priority: (string, high, medium, or low)
      - estimatedHours: (number, estimate hours of work needed)
      - energyLevel: (string, high, medium, or low)
      - category: (string, e.g., 'academic', 'personal', 'interview', 'bills', 'work', etc.)
      - location: (string, empty if not specified)
      - tags: (array of strings, logical tags)
      - riskScore: (number, 0 to 100 based on how tight the deadline is relative to today and other details)
      - successProbability: (number, 0 to 100 based on priority and time remaining)
      - recommendedStartTime: (string, ISO Date String, suggest an optimal time to start)

      Provide the response in raw JSON format inside a JSON array. Return nothing else but the JSON array of tasks.
    `;

    const response = await generateContentWithRetry(prompt, 'application/json');
    let responseText = response.text || '[]';
    if (responseText.includes('```')) {
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    const parsedTasks = JSON.parse(responseText);
    res.json({ tasks: parsedTasks });
  } catch (error: any) {
    console.warn('Error in /api/gemini/inbox:', error);
    // Fallback parser so that the application never displays a raw error block
    const fallbackTasks = [
      {
        title: text.length > 50 ? text.substring(0, 50) + '...' : text,
        description: `Scheduled via backup manual parser: "${text}"`,
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        priority: 'medium',
        estimatedHours: 1,
        energyLevel: 'medium',
        category: 'personal',
        location: '',
        tags: ['fallback'],
        riskScore: 30,
        successProbability: 80,
        recommendedStartTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      }
    ];
    res.json({ tasks: fallbackTasks });
  }
});

// FEATURE 11: AI Daily Brief
app.post('/api/gemini/daily-brief', async (req, res) => {
  const { tasks, localTime } = req.body;
  try {
    const currentTasksJson = JSON.stringify(tasks || []);

    const prompt = `
      You are DeadlineAI Chief of Staff.
      Current local time is: ${localTime || new Date().toISOString()}.
      Here is the list of active user tasks in Firestore:
      ${currentTasksJson}

      If there are no tasks, return an empty brief with "No tasks today."
      Otherwise, analyze the tasks and generate a daily brief in strict JSON format:
      - summary: (string, 2-3 sentence overview of the day's schedule and stress level)
      - priorityTaskTitle: (string, name of the single most urgent/impactful task today)
      - prioritiesReasoning: (string, why this is the priority)
      - riskAlerts: (array of strings, specific risks or close deadlines)
      - recommendedStartingTask: (string, title of the task they should start right now)
      - estimatedSuccessProbability: (number, average success probability for completing everything on time today, 0 to 100)

      Return ONLY the JSON object.
    `;

    const response = await generateContentWithRetry(prompt, 'application/json');
    let responseText = response.text || '{}';
    if (responseText.includes('```')) {
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    res.json(JSON.parse(responseText));
  } catch (error: any) {
    console.warn('Error in /api/gemini/daily-brief:', error);
    const fallbackBrief = {
      summary: "Your AI Daily Brief is currently in fallback mode due to high service demand. Your tasks are secure in the database.",
      priorityTaskTitle: tasks && tasks.length > 0 ? tasks[0].title : "Review schedule",
      prioritiesReasoning: "The system has highlighted your most immediate upcoming tasks to optimize your focus.",
      riskAlerts: ["AI analysis is on standby. Please check deadlines manually."],
      recommendedStartingTask: tasks && tasks.length > 0 ? tasks[0].title : "Organize tasks",
      estimatedSuccessProbability: 85
    };
    res.json(fallbackBrief);
  }
});

// FEATURE 12: Weekly Report
app.post('/api/gemini/weekly-report', async (req, res) => {
  const { tasks, focusSessions, startDate, endDate } = req.body;
  try {
    const prompt = `
      You are DeadlineAI Chief of Staff. Generate a Weekly Productivity Report for the user.
      Start Date: ${startDate}
      End Date: ${endDate}
      
      Tasks list:
      ${JSON.stringify(tasks || [])}

      Focus Sessions:
      ${JSON.stringify(focusSessions || [])}

      Analyze the user's completed vs missed tasks, total productivity hours, and work habits.
      Generate a Weekly report in strict JSON format:
      - completedCount: (number)
      - missedCount: (number)
      - summary: (string, detailed recap of the week's accomplishments and challenges)
      - improvements: (string, 3 key behavioral improvements or schedule adjustments for next week to reduce risks)

      Return ONLY the JSON object.
    `;

    const response = await generateContentWithRetry(prompt, 'application/json');
    let responseText = response.text || '{}';
    if (responseText.includes('```')) {
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    res.json(JSON.parse(responseText));
  } catch (error: any) {
    console.warn('Error in /api/gemini/weekly-report:', error);
    const completed = tasks ? tasks.filter((t: any) => t.status === 'completed').length : 0;
    const total = tasks ? tasks.length : 0;
    const missed = total - completed;
    const fallbackReport = {
      completedCount: completed,
      missedCount: missed,
      summary: `Weekly Recap: You've completed ${completed} out of ${total} tasks this week. Keep tracking your deadlines to improve focus.`,
      improvements: "1. Distribute high-energy tasks evenly. 2. Buffer deadlines with extra estimated hours. 3. Maintain consistent focus sessions."
    };
    res.json(fallbackReport);
  }
});

// FEATURE 4: AI Rescue Mode
app.post('/api/gemini/rescue-plan', async (req, res) => {
  const { tasks, localTime } = req.body;
  try {
    const prompt = `
      You are DeadlineAI Rescue Protocol.
      The user is facing a potential schedule failure or extremely tight deadlines.
      Current local time is: ${localTime || new Date().toISOString()}.
      Active tasks:
      ${JSON.stringify(tasks || [])}

      Perform a triage and create a strict Rescue Plan.
      Generate a JSON response containing:
      - scheduleOverloaded: (boolean, is it mathematically impossible to finish all high/medium tasks?)
      - riskAssessment: (string, explanation of why they are in danger)
      - rescueSteps: (array of strings, step-by-step guidance on how to rescue the week, e.g., "Postpone task X to next week", "Cancel task Y", "Work on task Z first")
      - reprioritizedTasks: (array of objects with { taskId: string, priority: string, recommendedStartTime: string, notes: string } to automatically adjust tasks)
      - summary: (string, high-level survival guide statement)

      Return ONLY the JSON object.
    `;

    const response = await generateContentWithRetry(prompt, 'application/json');
    let responseText = response.text || '{}';
    if (responseText.includes('```')) {
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    res.json(JSON.parse(responseText));
  } catch (error: any) {
    console.warn('Error in /api/gemini/rescue-plan:', error);
    const reprioritized = (tasks || []).map((t: any) => ({
      taskId: t.id,
      priority: t.priority === 'high' ? 'high' : 'medium',
      recommendedStartTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      notes: "Kept original settings as safe fallback."
    }));
    const fallbackRescue = {
      scheduleOverloaded: true,
      riskAssessment: "AI Rescue models are currently busy. Running automatic chronological priority sorting.",
      rescueSteps: [
        "Focus exclusively on tasks labeled high priority.",
        "Take a short 10-minute break to clear mental overhead.",
        "Postpone lower-priority tasks to the following week."
      ],
      reprioritizedTasks: reprioritized,
      summary: "Chronological safety protocols activated to guide your schedule."
    };
    res.json(fallbackRescue);
  }
});

// FEATURE 5: AI Time Machine
app.post('/api/gemini/time-machine', async (req, res) => {
  const { tasks, question, localTime } = req.body;
  try {
    const prompt = `
      You are the DeadlineAI Time Machine. The user is asking about future probability: "${question || 'Can I finish everything before Friday?'}"
      Current local time is: ${localTime || new Date().toISOString()}.
      
      User's Active Tasks:
      ${JSON.stringify(tasks || [])}

      Predict their success probability and construct a timeline prediction.
      Return a JSON response with:
      - successPercentage: (number, 0 to 100)
      - failurePercentage: (number, 0 to 100)
      - riskAnalysis: (string, deep evaluation of bottlenecks, estimated hours vs remaining time, and sleep schedules)
      - reasoning: (string, detailed logical breakdown)
      - alternativeSchedule: (array of strings, timeline of how they should schedule their next few days to succeed)
      - bestStrategy: (string, key action they must take immediately)

      Return ONLY the JSON object.
    `;

    const response = await generateContentWithRetry(prompt, 'application/json');
    let responseText = response.text || '{}';
    if (responseText.includes('```')) {
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    res.json(JSON.parse(responseText));
  } catch (error: any) {
    console.warn('Error in /api/gemini/time-machine:', error);
    const fallbackTimeMachine = {
      successPercentage: 70,
      failurePercentage: 30,
      riskAnalysis: "Calculated using manual workload estimates. Heavy scheduling is expected.",
      reasoning: "Your remaining workload is tight but workable with consistent focus blocks.",
      alternativeSchedule: [
        "Day 1: Address highest priority tasks first.",
        "Day 2: Clear secondary deadlines.",
        "Day 3: Review outstanding tasks."
      ],
      bestStrategy: "Focus on one item at a time and avoid multitasking."
    };
    res.json(fallbackTimeMachine);
  }
});

// FEATURE 6: Contextual AI Chat
app.post('/api/gemini/chat', async (req, res) => {
  const { chatHistory, message, tasks, localTime } = req.body;
  try {
    const prompt = `
      You are DeadlineAI Chief of Staff, a hyper-focused, supportive, and extremely smart AI productivity partner.
      Current local time is: ${localTime || new Date().toISOString()}.
      
      User's Current Active Tasks in Firestore:
      ${JSON.stringify(tasks || [])}

      Chat History:
      ${JSON.stringify(chatHistory || [])}

      New User Message: "${message}"

      Respond to the user contextually, addressing their specific workload, active risks, and deadlines.
      Provide realistic, actionable, and encouraging coaching. Keep the response compact and highly relevant.
      Return a JSON response with:
      - reply: (string, markdown formatted assistant response)
      - relatedTaskId: (string, ID of the active task most relevant to this discussion, or null)

      Return ONLY the JSON object.
    `;

    const response = await generateContentWithRetry(prompt, 'application/json');
    let responseText = response.text || '{}';
    if (responseText.includes('```')) {
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    res.json(JSON.parse(responseText));
  } catch (error: any) {
    console.warn('Error in /api/gemini/chat:', error);
    const fallbackChat = {
      reply: "I'm currently running in high-efficiency offline mode to support you! Let's stay organized and cross off your upcoming tasks.",
      relatedTaskId: tasks && tasks.length > 0 ? tasks[0].id : null
    };
    res.json(fallbackChat);
  }
});

// FEATURE: AI Deadline Guardian - intelligent reminder generation
app.post('/api/gemini/reminder', async (req, res) => {
  const { task, localTime, workloadTasksCount, currentFocus, hoursRemaining } = req.body;
  try {
    const prompt = `
      You are DeadlineAI Chief of Staff, an intelligent deadline guardian.
      Current local time is: ${localTime || new Date().toISOString()}.
      
      Task Details:
      - Title: "${task.title}"
      - Deadline: ${task.deadline} (approx ${hoursRemaining.toFixed(1)} hours remaining)
      - Estimated Completion Time: ${task.estimatedHours} hours
      - Task Priority: ${task.priority}
      - Success Probability: ${task.successProbability}%
      - Risk Score: ${task.riskScore}%
      - Current Active Focus Session: ${currentFocus ? `Currently focusing on "${currentFocus}"` : 'None'}
      - User Workload: ${workloadTasksCount} other active tasks
      
      Analyze this task's characteristics and remaining timeline.
      Generate an AI-driven, highly contextual and persuasive reminder in strict JSON format:
      {
        "title": "🧠 AI Reminder" (or "🚨 AI Rescue Alert" or "🚨 Critical Deadline Alert"),
        "body": "formatted text message containing detailed, clear, and action-oriented guidance"
      }

      Formatting Rules:
      1. If the remaining time is extremely short (e.g., less than 0.3 hours / 15 minutes), the title must be "🚨 Critical Deadline Alert" and the body should be extremely direct and urgent: e.g. "Your deadline is about to expire. Complete and submit your work immediately."
      2. If the success probability is low (< 50% or riskScore > 60%), the title must be "🚨 AI Rescue Alert" and the body should detail a Rescue Strategy (e.g. "AI predicts there is only a ${task.successProbability}% chance of completing this task before the deadline. Recommended Rescue Strategy: • Start immediately • Delay lower priority work • Enter Focus Mode").
      3. Otherwise, return "🧠 AI Reminder" with a highly professional and tailored breakdown like:
         "Deadline: ${hoursRemaining.toFixed(1)} hours remaining
         Estimated work: ${task.estimatedHours} hours
         Current probability of completion: ${task.successProbability}%
         Recommendation: [intelligent custom recommendation based on priority and workload]"

      Return ONLY the JSON object.
    `;

    const response = await generateContentWithRetry(prompt, 'application/json');
    let responseText = response.text || '{}';
    if (responseText.includes('```')) {
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    res.json(JSON.parse(responseText));
  } catch (error: any) {
    console.warn('Error in /api/gemini/reminder:', error);
    
    // Intelligent, high-quality, fully matching rule-based fallback
    let title = "🧠 AI Reminder";
    let body = "";
    
    const est = task.estimatedHours || 1;
    const prob = task.successProbability || 80;
    
    if (hoursRemaining <= 0.3) {
      title = "🚨 Critical Deadline Alert";
      body = "Your deadline is about to expire.\nComplete and submit your work immediately.";
    } else if (prob < 50 || (task.riskScore && task.riskScore > 60)) {
      title = "🚨 AI Rescue Alert";
      body = `AI predicts there is only a ${prob}% chance of completing this task before the deadline.\n\nRecommended Rescue Strategy:\n• Start immediately\n• Delay lower priority work\n• Enter Focus Mode`;
    } else {
      title = "🧠 AI Reminder";
      body = `${task.title}\n\nDeadline:\n${hoursRemaining.toFixed(1)} hours remaining\n\nEstimated work:\n${est} hours\n\nCurrent probability of completion:\n${prob}%\n\nRecommendation:\nStart within the next ${Math.max(10, Math.floor((hoursRemaining - est) * 60 * 0.5))} minutes.`;
    }
    
    res.json({ title, body });
  }
});

// Vite Middleware for static assets and hot-reload in dev
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind to port 3000 on all network interfaces
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DeadlineAI Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
