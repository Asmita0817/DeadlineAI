/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { aiService } from '../services/api';
import { googleCalendarService } from '../services/calendar';
import {
  Sparkles,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Calendar,
  Zap,
  RefreshCw,
  Plus,
  Play
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDate, getRelativeTimeDescription } from '../utils/date';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user, tasks, tasksLoading, updateTask, accessToken, addNotification } = useApp();
  const navigate = useNavigate();
  const [brief, setBrief] = useState<any>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  const firstName = user?.displayName ? user.displayName.split(' ')[0] : 'Professional';

  // Live analytics calculations from tasks
  const totalTasksCount = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const pendingTasks = tasks.filter((t) => t.status !== 'completed');

  const completionRate = totalTasksCount > 0 ? Math.round((completedTasks.length / totalTasksCount) * 100) : 0;

  const averageRiskScore = pendingTasks.length > 0 
    ? Math.round(pendingTasks.reduce((acc, t) => acc + (t.riskScore || 0), 0) / pendingTasks.length)
    : 0;

  const averageSuccessProbability = pendingTasks.length > 0
    ? Math.round(pendingTasks.reduce((acc, t) => acc + (t.successProbability || 0), 0) / pendingTasks.length)
    : 100;

  // Next critical task
  const nextCriticalTask = pendingTasks
    .filter((t) => t.priority === 'high')
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0];

  const highRiskCount = pendingTasks.filter(t => (t.riskScore || 0) > 60).length;
  const hasHighRisk = highRiskCount > 0;

  // Fetch AI Briefing when tasks change
  useEffect(() => {
    if (tasks.length === 0) {
      setBrief(null);
      return;
    }

    const fetchBrief = async () => {
      setBriefLoading(true);
      try {
        const localTime = new Date().toISOString();
        const response = await aiService.getDailyBrief(tasks, localTime);
        setBrief(response);

        // Check for urgent risk alerts to trigger smart browser alarms
        if (response.riskAlerts && response.riskAlerts.length > 0) {
          response.riskAlerts.forEach((alert: string) => {
            addNotification('CRITICAL WORKLOAD RISK', alert, 'critical');
          });
        }
      } catch (err) {
        console.error('AI Briefing failed:', err);
      } finally {
        setBriefLoading(false);
      }
    };

    fetchBrief();
  }, [tasks]);

  const toggleTaskCompletion = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    await updateTask(taskId, { status: newStatus });
  };

  const syncTaskToGoogleCalendar = async (task: any) => {
    if (!accessToken) {
      toast.error('Connect Google Calendar in Settings first!');
      return;
    }

    const toastId = toast.loading('Syncing with Google Calendar...');
    const eventId = await googleCalendarService.createEvent(task, accessToken);
    if (eventId) {
      await updateTask(task.id, { calendarEventId: eventId });
      toast.success('Successfully added event to Google Calendar!', { id: toastId });
    } else {
      toast.error('Google Calendar Sync failed', { id: toastId });
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Upper Grid: Heading and Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-light text-slate-300">
            Good Morning, <span className="font-extrabold text-white uppercase tracking-tight">{firstName}</span>
          </h1>
          {hasHighRisk ? (
            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <p className="text-sm text-slate-400">
                System Status: <span className="text-rose-400 font-bold uppercase">Rescue Mode Active</span> — {highRiskCount} Critical Bottlenecks Detected.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-sm text-slate-400">
                System Status: <span className="text-emerald-400 font-bold uppercase">All Systems Optimal</span> — Your schedule is clean and healthy.
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-3 shrink-0">
          <Link
            to="/inbox"
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-xs font-bold rounded-full shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>AI Schedule Ingestion</span>
          </Link>
          <Link
            to="/rescue"
            className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-full active:scale-95 transition-all cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>AI Rescue Panel</span>
          </Link>
        </div>
      </div>

      {/* Hero Adaptive Rescue/Brief Card */}
      {hasHighRisk ? (
        <div className="relative bg-gradient-to-r from-rose-950/40 to-rose-900/10 border border-rose-500/30 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between shadow-2xl overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-rose-600/5 blur-[60px] rounded-full"></div>
          <div className="relative z-10 space-y-3 max-w-2xl">
            <span className="inline-block px-3 py-1 bg-rose-500 text-white text-[10px] font-bold rounded-full uppercase tracking-widest">
              AI Intelligence: Danger Zone
            </span>
            <h2 className="text-2xl font-bold uppercase italic text-white leading-tight">
              {nextCriticalTask ? `Immediate Risk: ${nextCriticalTask.title}` : "Workload Schedule Conflict Detected"}
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              {brief ? brief.summary : "Multiple items are due near each other. Your average schedule risk has risen. Consider activating AI Rescue Protocol to buffer deadlines."}
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => navigate('/rescue')}
                className="px-6 py-2 bg-rose-600 hover:bg-rose-500 rounded-full text-xs font-bold text-white transition-colors shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Accept Rescue Plan
              </button>
              <button
                onClick={() => navigate('/rescue')}
                className="px-6 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full text-xs font-bold text-slate-300 transition-colors cursor-pointer"
              >
                Analyze Workload
              </button>
            </div>
          </div>
          <div className="relative z-10 text-center pr-4 mt-6 md:mt-0">
            <p className="text-[64px] font-mono font-bold text-rose-500 leading-none">
              {averageRiskScore}
            </p>
            <p className="text-[10px] text-rose-300/60 uppercase font-bold tracking-wider">Risk Index</p>
          </div>
        </div>
      ) : (
        <div className="relative bg-gradient-to-r from-indigo-950/30 to-indigo-900/5 border border-indigo-500/20 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between shadow-2xl overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-600/5 blur-[60px] rounded-full"></div>
          <div className="relative z-10 space-y-3 max-w-2xl">
            <span className="inline-block px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full uppercase tracking-widest">
              Active Cognitive Intelligence
            </span>
            <h2 className="text-2xl font-bold uppercase italic text-white leading-tight">
              Schedule Health Optimized
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              {briefLoading ? "Analyzing schedule logs..." : brief ? brief.summary : "Your focus stream is optimized. Add incoming assignments or sync tasks with calendar integration."}
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => navigate('/focus')}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-full text-xs font-bold text-white transition-colors shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                Launch Focus Session
              </button>
              <button
                onClick={() => navigate('/chat')}
                className="px-6 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full text-xs font-bold text-slate-300 transition-colors cursor-pointer"
              >
                Ask Chief of Staff
              </button>
            </div>
          </div>
          <div className="relative z-10 text-center pr-4 mt-6 md:mt-0">
            <p className="text-[64px] font-mono font-bold text-indigo-400 leading-none">
              {brief ? brief.estimatedSuccessProbability : averageSuccessProbability}%
            </p>
            <p className="text-[10px] text-indigo-300/60 uppercase font-bold tracking-wider">Completion Prob.</p>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Completion Card */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-xl flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Task Completion Rate
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-extrabold text-white">{completionRate}%</span>
              <span className="text-xs font-bold text-emerald-400">
                {completedTasks.length}/{totalTasksCount}
              </span>
            </div>
          </div>
          <div className="mt-6">
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${completionRate}%` }}></div>
            </div>
          </div>
        </div>

        {/* Risk Meter Card */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-xl flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Average Schedule Risk
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-extrabold text-white">{averageRiskScore}%</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${averageRiskScore > 60 ? 'bg-rose-500/10 text-rose-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                {averageRiskScore > 60 ? 'CRITICAL' : 'STABLE'}
              </span>
            </div>
          </div>
          <div className="mt-6">
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full ${averageRiskScore > 60 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                style={{ width: `${averageRiskScore}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Success Probability Card */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-xl flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Completion Probability
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-extrabold text-white">
                {brief ? brief.estimatedSuccessProbability : averageSuccessProbability}%
              </span>
              <span className="text-xs text-indigo-400 font-bold">Predictive Model</span>
            </div>
          </div>
          <div className="mt-6">
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500"
                style={{ width: `${brief ? brief.estimatedSuccessProbability : averageSuccessProbability}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Next Critical Deadline Card */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-xl flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Critical Urgency Target
            </p>
            {nextCriticalTask ? (
              <div className="mt-2">
                <p className="text-sm font-bold text-white truncate">{nextCriticalTask.title}</p>
                <p className="text-xs text-rose-400 font-medium mt-1">
                  {getRelativeTimeDescription(nextCriticalTask.deadline)}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-2">No active urgency targets.</p>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Workstation Timer</span>
            <Link to="/focus" className="text-indigo-400 font-bold hover:underline">
              Start &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Main Task List Workspaces */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's & Pending Tasks Column */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-400" />
              <span>Active Commitments Intake Stream</span>
            </h3>
            <span className="text-xs text-slate-500 font-bold">
              {pendingTasks.length} pending
            </span>
          </div>

          {tasksLoading ? (
            <div className="py-12 flex items-center justify-center text-slate-400 text-xs gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Querying database streams...</span>
            </div>
          ) : pendingTasks.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-3">
              <p>Your database contains zero active commitments.</p>
              <Link
                to="/inbox"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full text-xs"
              >
                Ingest tasks with AI &rarr;
              </Link>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-start gap-3 hover:border-indigo-500/30 transition-all group hover:bg-white/10"
                >
                  <div className="flex gap-3">
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      onChange={() => task.id && toggleTaskCompletion(task.id, task.status)}
                      className="mt-1 w-4 h-4 border border-white/15 bg-black text-indigo-600 rounded focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">
                        {task.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-sm leading-relaxed">
                        {task.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          task.priority === 'high' ? 'bg-rose-500/10 text-rose-400' : 'bg-white/5 text-slate-400'
                        }`}>
                          {task.priority}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono bg-black/40 px-2 py-0.5 rounded-full">
                          ⏱ {task.estimatedHours} hrs
                        </span>
                        <span className="text-[10px] text-indigo-400 bg-indigo-950/20 px-2 py-0.5 rounded-full">
                          ⚡️ {task.energyLevel} energy
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex flex-col justify-between h-full min-h-[60px] shrink-0">
                    <div>
                      <span className="text-[10px] font-medium text-slate-400 block">
                        {formatDate(task.deadline)}
                      </span>
                      <span className="text-[9px] font-bold text-rose-400 block mt-1">
                        {getRelativeTimeDescription(task.deadline)}
                      </span>
                    </div>

                    {accessToken && !task.calendarEventId ? (
                      <button
                        onClick={() => syncTaskToGoogleCalendar(task)}
                        className="text-[10px] font-bold text-indigo-400 flex items-center gap-1 mt-2 self-end hover:underline cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Sync Calendar</span>
                      </button>
                    ) : task.calendarEventId ? (
                      <span className="text-[9px] text-emerald-400 font-semibold mt-2 block">
                        ✓ Synced
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Stream & Focus Area */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <h3 className="text-md font-bold text-white flex items-center gap-2 border-b border-white/5 pb-4">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <span>Calendar Event Synced Logs</span>
            </h3>

            <div className="space-y-3">
              {tasks.filter((t) => t.calendarEventId).length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-8 leading-relaxed">
                  No active tasks synced to Google Calendar yet. Connect your Google account in settings to auto-schedule events!
                </div>
              ) : (
                tasks
                  .filter((t) => t.calendarEventId)
                  .map((task) => (
                    <div
                      key={task.id}
                      className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center justify-between text-xs hover:border-white/10 transition-all"
                    >
                      <div className="overflow-hidden pr-2">
                        <p className="font-semibold text-white truncate">{task.title}</p>
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5 truncate">
                          ID: {task.calendarEventId?.substring(0, 8)}...
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                        Scheduled
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-white/5">
            <span className="text-[10px] font-bold text-indigo-400 block mb-1 uppercase tracking-wider">
              Productivity Boost Active
            </span>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Block distractions and kickstart a high-intensity focus session now.
            </p>
            <button
              onClick={() => navigate('/focus')}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Flame className="w-4 h-4 text-amber-300" />
              <span>Launch Focus Pomodoro</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
