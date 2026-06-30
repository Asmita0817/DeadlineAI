/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Inbox,
  Hourglass,
  Flame,
  Clock,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  Calendar,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, notifications, markNotificationRead, tasks, signInWithGoogle } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const navigation = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'AI Inbox', path: '/inbox', icon: Inbox },
    { name: 'Focus Mode', path: '/focus', icon: Flame },
    { name: 'Rescue Protocol', path: '/rescue', icon: Hourglass },
    { name: 'AI Time Machine', path: '/time-machine', icon: Clock },
    { name: 'AI Chat', path: '/chat', icon: MessageSquare },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings }
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;
  const activeTasksCount = tasks.filter((t) => t.status !== 'completed').length;

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100 font-sans flex overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-white/10 bg-black/40 flex flex-col justify-between shrink-0 h-screen z-20">
        <div className="flex flex-col flex-grow overflow-hidden">
          {/* Logo & Branding */}
          <div className="h-20 flex items-center gap-3 px-6 border-b border-white/10 bg-black/20 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)]">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight italic text-white">
              Deadline<span className="text-indigo-500">AI</span>
            </span>
          </div>

          {/* Navigation Links and Widgets Scrollable Container */}
          <div className="flex-grow overflow-y-auto p-4 space-y-6">
            <nav className="space-y-1.5">
              {navigation.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-white/5 border border-white/10 text-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.15)] font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Pro Active AI status Widget */}
            <div className="p-4 bg-gradient-to-br from-indigo-900/40 to-transparent border border-indigo-500/30 rounded-2xl">
              <p className="text-xs text-indigo-300 uppercase tracking-widest font-bold mb-1">Pro Active</p>
              <p className="text-[10px] text-indigo-200/60 leading-tight mb-3">Gemini is currently analyzing {activeTasksCount} tasks for risk.</p>
              <button
                onClick={() => navigate('/analytics')}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg hover:shadow-indigo-500/20 transition-all cursor-pointer"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>

        {/* User Info & Action Button */}
        <div className="p-4 border-t border-white/10 bg-black/40 shrink-0">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center overflow-hidden">
              <img
                src={user?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.displayName}`}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">
                {user?.displayName || 'Productive User'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {(user?.uid === 'guest_user' || user?.uid?.startsWith('Guest-')) ? 'Local Session' : user?.email}
              </p>
            </div>
          </div>
          {(user?.uid === 'guest_user' || user?.uid?.startsWith('Guest-')) ? (
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95 transition-all cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Connect Google</span>
            </button>
          ) : (
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors border border-rose-500/20 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col h-screen overflow-hidden">
        {/* Header Bar */}
        <header className="h-20 bg-black/20 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-slate-400 bg-white/5 px-4 py-2 rounded-full border border-white/10">
              ⏰ Real Time: {new Date().toLocaleDateString()}
            </span>
          </div>

          {/* Action Items */}
          <div className="flex items-center gap-4">
            {/* Notification Dropdown Indicator */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 text-slate-400 hover:text-white bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors relative cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-80 bg-[#09090b]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-30"
                  >
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Alert notifications
                      </span>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500">
                          All systems clear. No warnings.
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-4 flex gap-3 transition-colors cursor-pointer ${
                              notif.read ? 'bg-transparent' : 'bg-indigo-500/5'
                            }`}
                            onClick={() => notif.id && markNotificationRead(notif.id)}
                          >
                            <div className="mt-0.5 shrink-0">
                              {notif.type === 'critical' ? (
                                <AlertTriangle className="w-4 h-4 text-rose-400" />
                              ) : notif.type === 'warning' ? (
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                              ) : (
                                <Info className="w-4 h-4 text-indigo-400" />
                              )}
                            </div>
                            <div className="flex-grow">
                              <p className="text-xs font-semibold text-white">{notif.title}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">{notif.body}</p>
                              <span className="text-[9px] text-slate-500 block mt-1">
                                {new Date(notif.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Dynamic Outlet Stage */}
        <main className="flex-grow overflow-y-auto bg-transparent p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
