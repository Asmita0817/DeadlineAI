/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { aiService } from '../services/api';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Clock, Send, Sparkles, RefreshCw, Milestone, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TimeMachine() {
  const { tasks, user } = useApp();
  const [question, setQuestion] = useState('Can I finish everything before Friday?');
  const [loading, setLoading] = useState(false);
  const [projection, setProjection] = useState<any>(null);

  const handleProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      toast.error('Please input a timeline question');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Initiating temporal scheduling projection...');
    try {
      const localTime = new Date().toISOString();
      const res = await aiService.getTimeMachinePrediction(tasks, question, localTime);
      setProjection(res);

      // Log to history
      if (user) {
        if (user.uid === 'guest_user' || user.uid.startsWith('Guest-')) {
          const localHistory = localStorage.getItem('deadline_guest_ai_history');
          const list = localHistory ? JSON.parse(localHistory) : [];
          list.push({
            id: 'h_' + Math.random().toString(36).substr(2, 9),
            userId: user.uid,
            prompt: question,
            response: JSON.stringify(res),
            type: 'time_machine',
            createdAt: new Date().toISOString()
          });
          localStorage.setItem('deadline_guest_ai_history', JSON.stringify(list));
        } else {
          await addDoc(collection(db, 'ai_history'), {
            userId: user.uid,
            prompt: question,
            response: JSON.stringify(res),
            type: 'time_machine',
            createdAt: new Date().toISOString()
          });
        }
      }

      toast.success('Simulation projection generated!', { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Timeline projection failed', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 font-sans max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          AI Time Machine
        </h1>
        <p className="text-sm text-slate-400">
          Proactively simulate schedule outcomes. Project your current commitments into the future to identify critical scheduling constraints.
        </p>
      </div>

      {/* Projection Form */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
          <Clock className="w-5 h-5 text-indigo-400 animate-pulse" />
        </div>

        <form onSubmit={handleProject} className="space-y-4">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Temporal workload query
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Can I finish all school assignments before Friday?"
              className="flex-grow bg-black/40 border border-white/10 rounded-full px-5 py-3 focus:outline-none focus:border-indigo-500 text-sm text-white placeholder-slate-600 transition-colors"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-full active:scale-95 transition-all disabled:opacity-50 shrink-0 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Simulate Timeline</span>
            </button>
          </div>
        </form>
      </div>

      {/* Projection Outcomes */}
      {projection && (
        <div className="space-y-8 animate-fade-in">
          {/* Dual percentage indicator bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl relative shadow-xl">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                Simulation success index
              </span>
              <div className="text-4xl font-extrabold text-white mt-2">
                {projection.successPercentage}%
              </div>
              <div className="mt-4 w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${projection.successPercentage}%` }}></div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl relative shadow-xl">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                Bottleneck failure risk index
              </span>
              <div className="text-4xl font-extrabold text-white mt-2">
                {projection.failurePercentage}%
              </div>
              <div className="mt-4 w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${projection.failurePercentage}%` }}></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left large detail block */}
            <div className="md:col-span-2 bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider pb-3 border-b border-white/5 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Deep workload projection analysis</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {projection.riskAnalysis}
              </p>

              <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                  Reasoning
                </span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {projection.reasoning}
                </p>
              </div>
            </div>

            {/* Right scheduling alternative layout list */}
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex flex-col justify-between shadow-xl">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider pb-3 border-b border-white/5 flex items-center gap-2">
                  <Milestone className="w-4 h-4 text-indigo-400" />
                  <span>Optimal Strategy schedule path</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {projection.bestStrategy}
                </p>

                <div className="space-y-2 mt-4">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                    Timeline Recommendations:
                  </span>
                  {projection.alternativeSchedule && projection.alternativeSchedule.map((line: string, i: number) => (
                    <div key={i} className="flex gap-2 items-start text-xs text-slate-300">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-white/5 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] text-slate-500 font-medium leading-relaxed">Verified using cognitive schedule analysis models.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
