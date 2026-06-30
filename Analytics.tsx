/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { aiService } from '../services/api';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { BarChart3, Sparkles, RefreshCw, Milestone, Flame, CheckCircle, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Analytics() {
  const { tasks, user } = useApp();
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [focusSessions, setFocusSessions] = useState<any[]>([]);

  // Fetch real focus sessions from Firestore on mount
  useEffect(() => {
    if (!user) return;
    const fetchSessions = async () => {
      try {
        if (user.uid === 'guest_user' || user.uid.startsWith('Guest-')) {
          const localSessions = localStorage.getItem('deadline_guest_focus_sessions');
          setFocusSessions(localSessions ? JSON.parse(localSessions) : []);
          return;
        }
        const q = query(collection(db, 'focus_sessions'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const list: any[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setFocusSessions(list);
      } catch (err) {
        console.error('Failed to load focus sessions:', err);
      }
    };
    fetchSessions();
  }, [user]);

  // Aggregate Category Data
  const categoriesMap: { [key: string]: number } = {};
  tasks.forEach((t) => {
    const cat = t.category || 'general';
    categoriesMap[cat] = (categoriesMap[cat] || 0) + 1;
  });

  const categoryChartData = Object.keys(categoriesMap).map((cat) => ({
    name: cat.toUpperCase(),
    value: categoriesMap[cat]
  }));

  // Aggregate Risk Scores for chart
  const riskChartData = tasks.map((t) => ({
    name: t.title.substring(0, 12),
    'Risk Score': t.riskScore || 0,
    'Success Probability': t.successProbability || 100
  }));

  const COLORS = ['#06b6d4', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

  const totalFocusMinutes = focusSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const avgProductivityScore = focusSessions.length > 0
    ? (focusSessions.reduce((acc, s) => acc + (s.productivityScore || 0), 0) / focusSessions.length).toFixed(1)
    : 'N/A';

  const handleGenerateReport = async () => {
    setReportLoading(true);
    const toastId = toast.loading('Consulting Gemini AI to compile weekly progress report...');
    try {
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const report = await aiService.getWeeklyReport(
        tasks,
        focusSessions,
        lastWeek.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      );
      
      setWeeklyReport(report);

      // Save to Firebase Database
      if (user) {
        if (user.uid === 'guest_user' || user.uid.startsWith('Guest-')) {
          const localReports = localStorage.getItem('deadline_guest_weekly_reports');
          const list = localReports ? JSON.parse(localReports) : [];
          list.push({
            id: 'wr_' + Math.random().toString(36).substr(2, 9),
            userId: user.uid,
            startDate: lastWeek.toISOString(),
            endDate: today.toISOString(),
            completedCount: report.completedCount || 0,
            missedCount: report.missedCount || 0,
            summary: report.summary,
            improvements: report.improvements,
            createdAt: new Date().toISOString()
          });
          localStorage.setItem('deadline_guest_weekly_reports', JSON.stringify(list));
        } else {
          await addDoc(collection(db, 'weekly_reports'), {
            userId: user.uid,
            startDate: lastWeek.toISOString(),
            endDate: today.toISOString(),
            completedCount: report.completedCount || 0,
            missedCount: report.missedCount || 0,
            summary: report.summary,
            improvements: report.improvements,
            createdAt: new Date().toISOString()
          });
        }
      }

      toast.success('Weekly report compiled!', { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Report generation failed', { id: toastId });
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Cognitive Analytics Engine
        </h1>
        <p className="text-sm text-slate-400">
          Proactive productivity indices, workload vectors, and performance reviews generated purely from Firestore data.
        </p>
      </div>

      {/* Numerical Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-xl">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">
            Focus hours logged
          </span>
          <p className="text-3xl font-extrabold text-white mt-1">
            {(totalFocusMinutes / 60).toFixed(1)} hrs
          </p>
          <span className="text-[10px] text-slate-500 block mt-2 font-medium">
            Based on {focusSessions.length} sessions
          </span>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-xl">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">
            Average flow index
          </span>
          <p className="text-3xl font-extrabold text-white mt-1">
            {avgProductivityScore} / 10
          </p>
          <span className="text-[10px] text-slate-500 block mt-2 font-medium">
            Subjective productivity rating
          </span>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-xl">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">
            Active Task Streams
          </span>
          <p className="text-3xl font-extrabold text-white mt-1">
            {tasks.length} total
          </p>
          <span className="text-[10px] text-slate-500 block mt-2 font-medium">
            Firestore collection document count
          </span>
        </div>
      </div>

      {/* Visual Recharts diagrams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Risk scores diagram */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-white/5">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span>Workload Risk Vector Projection</span>
          </h3>

          <div className="h-64 w-full text-xs">
            {riskChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                No active task metrics to map.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '1rem' }} />
                  <Bar dataKey="Risk Score" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Success Probability" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Distribution pie chart */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-white/5">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <span>Category Workload Allocation</span>
          </h3>

          <div className="h-64 w-full text-xs flex justify-center items-center">
            {categoryChartData.length === 0 ? (
              <div className="text-slate-500">
                No allocation data computed.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '1rem' }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Weekly AI Report Block */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-3xl shadow-xl space-y-6">
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Weekly AI Productivity Statement</span>
          </h2>
          <button
            onClick={handleGenerateReport}
            disabled={reportLoading}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-full active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            {reportLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Compiling Report...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Compile Weekly Performance</span>
              </>
            )}
          </button>
        </div>

        {weeklyReport ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-2">
                  Completed Tasks Count
                </span>
                <p className="text-2xl font-extrabold text-white">{weeklyReport.completedCount || 0}</p>
              </div>

              <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-2">
                  Missed / Lagging Tasks Count
                </span>
                <p className="text-2xl font-extrabold text-white">{weeklyReport.missedCount || 0}</p>
              </div>
            </div>

            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-3">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                Cognitive Performance Summary
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {weeklyReport.summary}
              </p>
            </div>

            <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20 space-y-3">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                Suggested Behavioral Adjustments
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {weeklyReport.improvements}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center py-6 leading-relaxed">
            Click compile above to analyze your Firestore task trends, completed percentages, and focus logs to generate a comprehensive diagnostic report.
          </p>
        )}
      </div>
    </div>
  );
}
