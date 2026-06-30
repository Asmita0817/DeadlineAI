/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { aiService } from '../services/api';
import { Sparkles, ArrowRight, BrainCircuit, RefreshCw, Send, CheckCircle2 } from 'lucide-react';
import { googleCalendarService } from '../services/calendar';
import { formatDate } from '../utils/date';
import toast from 'react-hot-toast';

export default function AIInbox() {
  const { addTask, accessToken, updateTask } = useApp();
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState<any[]>([]);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      toast.error('Please describe your commitments first');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Consulting Gemini AI Chief of Staff...');
    try {
      const localTime = new Date().toISOString();
      const tasks = await aiService.parseInboxText(inputText, localTime);
      setExtractedTasks(tasks);
      toast.success(`Success! Extracted ${tasks.length} tasks from your input.`, { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'AI extraction failed', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleCommitAll = async () => {
    if (extractedTasks.length === 0) return;
    setLoading(true);
    const toastId = toast.loading('Persisting tasks to Firebase database...');
    try {
      for (const task of extractedTasks) {
        // Automatically save task in Firestore
        await addTask({
          title: task.title,
          description: task.description || '',
          deadline: task.deadline,
          priority: task.priority || 'medium',
          estimatedHours: task.estimatedHours || 1,
          energyLevel: task.energyLevel || 'medium',
          category: task.category || 'personal',
          status: 'pending',
          notes: '',
          location: task.location || '',
          tags: task.tags || [],
          riskScore: task.riskScore || 30,
          successProbability: task.successProbability || 80,
          recommendedStartTime: task.recommendedStartTime || new Date().toISOString()
        });
      }
      setExtractedTasks([]);
      setInputText('');
      toast.success('All tasks loaded and synced to database!', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Persistence failed', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 font-sans max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          AI Schedule Ingestion
        </h1>
        <p className="text-sm text-slate-400">
          Proactive natural language processing. Stop filling out manual tables and forms. Let your AI Chief of Staff coordinate.
        </p>
      </div>

      {/* Input box */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
          <BrainCircuit className="w-5 h-5 text-indigo-400 animate-pulse" />
        </div>

        <form onSubmit={handleIngest} className="space-y-4">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Speak to your Chief of Staff
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder='Type your weekly workload naturally, for example: "I have Amazon OA tomorrow at 5PM, a critical DBMS assignment due this Friday, gym workouts at 7PM, and interview prep on Saturday."'
            rows={5}
            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 focus:outline-none focus:border-indigo-500 text-sm leading-relaxed text-slate-100 placeholder-slate-600 resize-none transition-colors"
            required
          />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
            <span className="text-[11px] text-slate-500 font-medium">
              ⚡ Includes auto risk evaluation, duration prediction, and prioritization models.
            </span>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-full shadow-lg shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ingest Schedule</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Extracted Tasks Review Area */}
      {extractedTasks.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Cognitive Extraction Results</span>
            </h2>
            <button
              onClick={handleCommitAll}
              disabled={loading}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-full active:scale-95 transition-all cursor-pointer"
            >
              <span>Commit All Tasks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
            {extractedTasks.map((task, idx) => (
              <div
                key={idx}
                className="bg-black/20 border border-white/5 p-4 rounded-2xl flex justify-between items-start gap-3 hover:border-white/10 transition-all"
              >
                <div>
                  <h3 className="text-xs font-bold text-white">{task.title}</h3>
                  <p className="text-[11px] text-slate-400 mt-1">{task.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    <span className="text-[10px] bg-indigo-950/40 text-indigo-400 font-bold uppercase px-2 py-0.5 rounded-full">
                      Priority: {task.priority}
                    </span>
                    <span className="text-[10px] bg-white/5 text-slate-400 font-mono px-2 py-0.5 rounded-full">
                      Duration: {task.estimatedHours} hrs
                    </span>
                    <span className="text-[10px] bg-indigo-950/20 text-indigo-400 px-2 py-0.5 rounded-full">
                      Energy: {task.energyLevel}
                    </span>
                    <span className="text-[10px] bg-white/5 text-slate-400 px-2 py-0.5 rounded-full">
                      Category: {task.category}
                    </span>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end shrink-0">
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {formatDate(task.deadline)}
                  </span>
                  <span className="text-[9px] font-bold text-indigo-400 mt-2">
                    Recommended Start:
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {formatDate(task.recommendedStartTime)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
