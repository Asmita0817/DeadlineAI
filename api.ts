/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task } from '../types';

interface ChatResponse {
  reply: string;
  relatedTaskId: string | null;
}

interface DailyBriefResponse {
  summary: string;
  priorityTaskTitle: string;
  prioritiesReasoning: string;
  riskAlerts: string[];
  recommendedStartingTask: string;
  estimatedSuccessProbability: number;
}

interface WeeklyReportResponse {
  completedCount: number;
  missedCount: number;
  summary: string;
  improvements: string;
}

interface RescuePlanResponse {
  scheduleOverloaded: boolean;
  riskAssessment: string;
  rescueSteps: string[];
  reprioritizedTasks: Array<{
    taskId: string;
    priority: 'high' | 'medium' | 'low';
    recommendedStartTime: string;
    notes: string;
  }>;
  summary: string;
}

interface TimeMachineResponse {
  successPercentage: number;
  failurePercentage: number;
  riskAnalysis: string;
  reasoning: string;
  alternativeSchedule: string[];
  bestStrategy: string;
}

export const aiService = {
  parseInboxText: async (text: string, localTime?: string): Promise<Task[]> => {
    const res = await fetch('/api/gemini/inbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, localTime })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to parse natural language schedule');
    }
    const data = await res.json();
    return data.tasks;
  },

  getDailyBrief: async (tasks: Task[], localTime?: string): Promise<DailyBriefResponse> => {
    const res = await fetch('/api/gemini/daily-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks, localTime })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to get daily AI briefing');
    }
    return res.json();
  },

  getWeeklyReport: async (
    tasks: Task[],
    focusSessions: any[],
    startDate: string,
    endDate: string
  ): Promise<WeeklyReportResponse> => {
    const res = await fetch('/api/gemini/weekly-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks, focusSessions, startDate, endDate })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to generate weekly report');
    }
    return res.json();
  },

  getRescuePlan: async (tasks: Task[], localTime?: string): Promise<RescuePlanResponse> => {
    const res = await fetch('/api/gemini/rescue-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks, localTime })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to trigger rescue protocols');
    }
    return res.json();
  },

  getTimeMachinePrediction: async (
    tasks: Task[],
    question: string,
    localTime?: string
  ): Promise<TimeMachineResponse> => {
    const res = await fetch('/api/gemini/time-machine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks, question, localTime })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to project schedule into the future');
    }
    return res.json();
  },

  sendChatMessage: async (
    message: string,
    chatHistory: any[],
    tasks: Task[],
    localTime?: string
  ): Promise<ChatResponse> => {
    const res = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, chatHistory, tasks, localTime })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'AI Chat failed');
    }
    return res.json();
  },

  getReminder: async (
    task: Task,
    localTime: string,
    workloadTasksCount: number,
    currentFocus: string | null,
    hoursRemaining: number
  ): Promise<{ title: string; body: string }> => {
    const res = await fetch('/api/gemini/reminder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, localTime, workloadTasksCount, currentFocus, hoursRemaining })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to generate intelligent AI reminder');
    }
    return res.json();
  }
};
