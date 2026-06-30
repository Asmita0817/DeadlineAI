/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { aiService } from '../services/api';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { AlertTriangle, Sparkles, RefreshCw, CheckCircle, ListChecks, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RescueMode() {
  const { tasks, updateTask, user } = useApp();
  const [loading, setLoading] = useState(false);
  const [rescuePlan, setRescuePlan] = useState<any>(null);

  const handleRunRescue = async () => {
    if (tasks.length === 0) {
      toast.error('No tasks found to perform triage on');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Initiating AI Rescue Protocol...');
    try {
      const localTime = new Date().toISOString();
      const plan = await aiService.getRescuePlan(tasks, localTime);
      setRescuePlan(plan);

      // Log to AI History
      if (user) {
        if (user.uid === 'guest_user' || user.uid.startsWith('Guest-')) {
          const localHistory = localStorage.getItem('deadline_guest_ai_history');
          const list = localHistory ? JSON.parse(localHistory) : [];
          list.push({
            id: 'h_' + Math.random().toString(36).substr(2, 9),
            userId: user.uid,
            prompt: 'Trigger AI Rescue Plan',
            response: JSON.stringify(plan),
            type: 'rescue_plan',
            createdAt: new Date().toISOString()
          });
          localStorage.setItem('deadline_guest_ai_history', JSON.stringify(list));
        } else {
          await addDoc(collection(db, 'ai_history'), {
            userId: user.uid,
            prompt: 'Trigger AI Rescue Plan',
            response: JSON.stringify(plan),
            type: 'rescue_plan',
            createdAt: new Date().toISOString()
          });
        }
      }

      toast.success('Rescue scenario computed successfully!', { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Rescue protocol failed', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAdjustments = async () => {
    if (!rescuePlan || !rescuePlan.reprioritizedTasks) return;
    setLoading(true);
    const toastId = toast.loading('Re-negotiating schedule rules in Firestore database...');
    try {
      let appliedCount = 0;
      for (const adjust of rescuePlan.reprioritizedTasks) {
        const found = tasks.find((t) => t.id === adjust.taskId);
        if (found) {
          await updateTask(adjust.taskId, {
            priority: adjust.priority,
            recommendedStartTime: adjust.recommendedStartTime,
            notes: `${found.notes || ''}\n[AI Rescue] Reprioritized from ${found.priority} to ${adjust.priority}. Recommendation: ${adjust.notes}`
          });
          appliedCount++;
        }
      }
      toast.success(`Success! Applied ${appliedCount} schedule adjustments.`, { id: toastId });
      setRescuePlan(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to apply adjustments', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 font-sans max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          AI Rescue Protocol
        </h1>
        <p className="text-sm text-slate-400">
          Emergency workload triage. If your schedule is mathematically impossible, our algorithms will reschedule, defer low-impact tasks, and rebuild a plan.
        </p>
      </div>

      {/* Triage Trigger Section */}
      <div className="bg-gradient-to-r from-rose-950/40 to-amber-950/20 border border-rose-500/30 rounded-3xl p-8 text-center shadow-xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
          <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
        </div>

        <div className="max-w-md mx-auto space-y-4">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-white uppercase tracking-tight">Trigger Schedule Crisis Assessment</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Clicking the assessment trigger analyzes your active deadlines, estimated work durations, and available focus capacity to build a mathematical safety net.
          </p>
          <button
            onClick={handleRunRescue}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-600 to-amber-500 hover:opacity-95 text-white font-bold text-xs rounded-full active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-rose-600/30 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running Simulations...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Rescue Simulation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Rescue Plan Results Section */}
      {rescuePlan && (
        <div className="space-y-6">
          <div className="bg-rose-950/35 border border-rose-500/30 p-6 rounded-3xl space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Triage Report: {rescuePlan.scheduleOverloaded ? 'SCHEDULE OVERLOAD DETECTED' : 'CAPACITY WORKABLE'}</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {rescuePlan.riskAssessment}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Step checklist */}
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-white/5">
                  <ListChecks className="w-4 h-4 text-indigo-400" />
                  <span>Triage Action Steps Checklist</span>
                </h4>
                <ul className="space-y-3 mt-4">
                  {rescuePlan.rescueSteps && rescuePlan.rescueSteps.map((step: string, i: number) => (
                    <li key={i} className="flex gap-3 items-start text-xs text-slate-300 leading-relaxed">
                      <input
                        type="checkbox"
                        className="mt-0.5 w-4 h-4 border border-white/15 bg-black text-rose-500 rounded focus:ring-0 cursor-pointer"
                      />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Reprioritized Adjustments Suggestion list */}
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-white/5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Proactive Rescheduling list</span>
                </h4>

                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {rescuePlan.reprioritizedTasks && rescuePlan.reprioritizedTasks.map((adjust: any, i: number) => {
                    const taskName = tasks.find((t) => t.id === adjust.taskId)?.title || 'Task';
                    return (
                      <div
                        key={i}
                        className="bg-black/20 p-3 rounded-xl border border-white/5 flex justify-between items-center text-xs hover:border-white/10 transition-all"
                      >
                        <div className="overflow-hidden pr-2">
                          <p className="font-semibold text-white truncate">{taskName}</p>
                          <span className="text-[10px] text-slate-400">
                            Recommended priority: <span className="text-rose-400 uppercase font-semibold">{adjust.priority}</span>
                          </span>
                        </div>
                        <span className="text-[9px] text-indigo-400 font-mono bg-indigo-950/20 px-2 py-0.5 rounded-full shrink-0">
                          Rescheduled
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {rescuePlan.reprioritizedTasks && rescuePlan.reprioritizedTasks.length > 0 && (
                <button
                  onClick={handleApplyAdjustments}
                  disabled={loading}
                  className="w-full mt-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-full active:scale-95 transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  Apply Rescheduling adjustments
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
