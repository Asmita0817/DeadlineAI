/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Flame, Play, Pause, RotateCcw, BrainCircuit, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FocusMode() {
  const { tasks, user, updateTask } = useApp();
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [productivityScore, setProductivityScore] = useState(8);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Highest impact task recommendation
  const recommendedTask = tasks
    .filter((t) => t.status !== 'completed')
    .sort((a, b) => b.riskScore - a.riskScore)[0];

  useEffect(() => {
    if (recommendedTask && !selectedTaskId) {
      setSelectedTaskId(recommendedTask.id || '');
    }
  }, [recommendedTask]);

  // Handle timer countdown
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (seconds === 0) {
          if (minutes === 0) {
            handleTimerComplete();
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        }
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, minutes, seconds]);

  const handleTimerComplete = () => {
    setIsActive(false);
    setSessionCompleted(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    toast.success('Congratulations! Focus session complete.');
    
    // Trigger notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new window.Notification('Focus Session Complete!', {
        body: 'Take a brief break and rate your productivity.'
      });
    }
  };

  const handleStartPause = () => {
    if (!selectedTaskId) {
      toast.error('Please select an active task to focus on');
      return;
    }
    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    setMinutes(25);
    setSeconds(0);
    setSessionCompleted(false);
  };

  const handleSaveSession = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const activeTask = tasks.find((t) => t.id === selectedTaskId);
      const sessionData = {
        userId: user.uid,
        taskId: selectedTaskId,
        taskTitle: activeTask ? activeTask.title : 'General Focus Session',
        durationMinutes: 25 - minutes, // actual minutes focused
        date: new Date().toISOString(),
        productivityScore,
        notes
      };

      if (user.uid === 'guest_user' || user.uid.startsWith('Guest-')) {
        const localSessions = localStorage.getItem('deadline_guest_focus_sessions');
        const list = localSessions ? JSON.parse(localSessions) : [];
        list.push({ id: 'fs_' + Math.random().toString(36).substr(2, 9), ...sessionData });
        localStorage.setItem('deadline_guest_focus_sessions', JSON.stringify(list));
      } else {
        await addDoc(collection(db, 'focus_sessions'), sessionData);
      }
      
      // Update task status optionally or just increment progress
      if (activeTask && activeTask.status === 'pending') {
        await updateTask(selectedTaskId, { status: 'in_progress' });
      }

      toast.success('Focus session recorded!');
      handleReset();
    } catch (error) {
      console.error(error);
      toast.error('Failed to log focus session');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 font-sans max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Active Deep Focus State
        </h1>
        <p className="text-sm text-slate-400">
          Activate cognitive isolation loops. Select your top milestone task and lock in productivity metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Timer Control Module */}
        <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center shadow-xl relative overflow-hidden">
          <div className="absolute top-4 left-4 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-widest">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Isolated Loop</span>
          </div>

          {/* Interactive Circle Timer UI */}
          <div className="relative w-64 h-64 flex items-center justify-center rounded-full border-4 border-white/5 bg-black/40 shadow-inner mt-4">
            {isActive && (
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping pointer-events-none"></div>
            )}
            <div className="text-center">
              <span className="text-6xl font-extrabold tracking-tight text-white font-mono block">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mt-1">
                Minutes Remaining
              </span>
            </div>
          </div>

          {/* Core Controls */}
          {!sessionCompleted ? (
            <div className="flex gap-4 mt-8">
              <button
                onClick={handleStartPause}
                className={`flex items-center gap-2 px-8 py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-lg shadow-rose-600/5'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                }`}
              >
                {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isActive ? 'Pause Flow' : 'Begin Focus'}</span>
              </button>
              <button
                onClick={handleReset}
                className="p-3 text-slate-400 hover:text-white bg-black border border-white/10 rounded-full active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="w-full space-y-4 mt-8 bg-black/40 p-6 rounded-2xl border border-white/10">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider text-center">
                Session Complete! Rate your Flow
              </h3>
              
              <div>
                <label className="text-xs font-semibold text-slate-400 flex justify-between mb-2">
                  <span>Productivity Index</span>
                  <span className="text-indigo-400 font-bold">{productivityScore}/10</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={productivityScore}
                  onChange={(e) => setProductivityScore(Number(e.target.value))}
                  className="w-full accent-indigo-500 bg-white/5 rounded-lg appearance-none h-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Session Work Log Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record your breakthroughs or milestones completed..."
                  rows={2}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-indigo-500 text-xs text-white"
                />
              </div>

              <button
                onClick={handleSaveSession}
                disabled={saving}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-full transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                {saving ? 'Saving...' : 'Record Session'}
              </button>
            </div>
          )}
        </div>

        {/* Task Selection panel */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
          <div>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
              Primary Objective
            </span>
            <h2 className="text-sm font-bold text-white uppercase tracking-tight">Select a commitment</h2>
          </div>

          <div className="space-y-3">
            {tasks.filter((t) => t.status !== 'completed').length === 0 ? (
              <p className="text-xs text-slate-500">
                You have zero pending commitments. Add some on the AI Inbox page first!
              </p>
            ) : (
              tasks
                .filter((t) => t.status !== 'completed')
                .map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id || '')}
                    className={`w-full p-4 rounded-2xl border text-left transition-all flex justify-between items-start gap-3 cursor-pointer ${
                      selectedTaskId === task.id
                        ? 'bg-indigo-500/10 border-indigo-500/60 text-white'
                        : 'bg-black/20 border-white/5 text-slate-400 hover:border-white/10'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-white truncate">{task.title}</p>
                      <span className="text-[9px] text-slate-400 block mt-1">
                        ⏱ Duration: {task.estimatedHours} hrs
                      </span>
                    </div>
                    {recommendedTask?.id === task.id && (
                      <span className="text-[9px] bg-rose-500/10 text-rose-400 font-bold px-2 py-0.5 rounded-full block shrink-0">
                        Top Impact
                      </span>
                    )}
                  </button>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
