/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Settings as SettingsIcon, Bell, Calendar, User, Eye, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user, settings, updateSettings, accessToken, signInWithGoogle } = useApp();

  const handleRequestNotifications = async () => {
    if (!('Notification' in window)) {
      toast.error('Browser does not support notifications');
      return;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await updateSettings({ browserNotifications: true });
        toast.success('Browser notification permissions granted!');
      } else {
        toast.error('Permission denied');
      }
    } else if (Notification.permission === 'granted') {
      await updateSettings({ browserNotifications: !settings?.browserNotifications });
      toast.success(settings?.browserNotifications ? 'Disabled notifications' : 'Enabled notifications');
    } else {
      toast.error('Notification permissions are blocked in your browser settings.');
    }
  };

  const handleConnectCalendar = async () => {
    try {
      await signInWithGoogle();
      toast.success('Successfully connected to Google Calendar services!');
    } catch (err) {
      console.error(err);
      toast.error('Google authorization failed');
    }
  };

  return (
    <div className="space-y-8 font-sans max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          System Control Panel
        </h1>
        <p className="text-sm text-slate-400">
          Configure notification alerts, OAuth connections, and active cognitive assistant settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Profile and general config */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile overview card */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-800">
              <User className="w-4 h-4 text-cyan-400" />
              <span>Identity Profile</span>
            </h3>

            <div className="flex items-center gap-4">
              <img
                src={user?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.email}`}
                alt="avatar"
                className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 p-0.5"
              />
              <div>
                <p className="text-sm font-bold text-white">
                  {user?.displayName || 'Productive Professional'}
                </p>
                <p className="text-xs text-slate-400 mt-1">{user?.email}</p>
                <span className="inline-block text-[10px] text-cyan-400 bg-cyan-950/20 px-2 py-0.5 rounded-full mt-2 font-bold uppercase">
                  Active Member
                </span>
              </div>
            </div>
          </div>

          {/* Preferences card */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-400" />
                <span>Alert Preferences</span>
              </h3>
              <button
                id="test-notification-btn"
                onClick={async () => {
                  toast('🧠 AI Guardian Test: System is fully armed and active!', {
                    duration: 5000,
                    icon: '🛡️'
                  });
                  if (settings?.browserNotifications && 'Notification' in window) {
                    if (Notification.permission === 'granted') {
                      new window.Notification("🧠 AI Deadline Guardian Active", {
                        body: "Test Alert: Your AI Deadline Guardian is online and monitoring your schedule timelines."
                      });
                    }
                  }
                  const { playNotificationSound } = await import('../utils/sound');
                  playNotificationSound();
                }}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3" />
                <span>Test Alert</span>
              </button>
            </div>

            <div className="space-y-4 divide-y divide-slate-800">
              {/* Browser Notifications Toggle */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-xs font-semibold text-white">Smart Browser Notifications</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Receive proactive warnings, escalation loops, and Pomodoro alarms directly in your browser.
                  </p>
                </div>
                <button
                  id="toggle-browser-notifications"
                  onClick={handleRequestNotifications}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    settings?.browserNotifications
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'bg-slate-950 text-slate-400 border border-slate-850 hover:text-white'
                  }`}
                >
                  {settings?.browserNotifications ? 'Enabled' : 'Enable Alarms'}
                </button>
              </div>

              {/* AI Reminders Toggle */}
              <div className="flex items-center justify-between pt-4 pb-2">
                <div>
                  <p className="text-xs font-semibold text-white">AI Deadline Guardian Engine</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Enables autonomous AI auditing, low-probability risk prediction alerts, and Rescue plans.
                  </p>
                </div>
                <button
                  id="toggle-ai-reminders"
                  onClick={async () => {
                    const nextVal = settings?.aiRemindersEnabled !== false ? false : true;
                    await updateSettings({ aiRemindersEnabled: nextVal });
                    toast.success(nextVal ? 'AI Guardian reminders enabled!' : 'AI Guardian reminders disabled.');
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    settings?.aiRemindersEnabled !== false
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-950 text-slate-400 border border-slate-850 hover:text-white'
                  }`}
                >
                  {settings?.aiRemindersEnabled !== false ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Notification Sound Toggle */}
              <div className="flex items-center justify-between pt-4 pb-2">
                <div>
                  <p className="text-xs font-semibold text-white">Notification Chime Sound</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Play an elegant double-beep ascending audio chime when reminders or risk alerts trigger.
                  </p>
                </div>
                <button
                  id="toggle-notification-sound"
                  onClick={async () => {
                    const nextVal = settings?.notificationSoundEnabled !== false ? false : true;
                    await updateSettings({ notificationSoundEnabled: nextVal });
                    toast.success(nextVal ? 'Notification chimes enabled!' : 'Notification chimes muted.');
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    settings?.notificationSoundEnabled !== false
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : 'bg-slate-950 text-slate-400 border border-slate-850 hover:text-white'
                  }`}
                >
                  {settings?.notificationSoundEnabled !== false ? 'Sound On' : 'Muted'}
                </button>
              </div>

              {/* Interval Selection thresholds */}
              <div className="pt-4 pb-2 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-white font-sans">Guardian Threshold Intervals</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Select exactly when the AI Guardian should wake up and run full-context analyses before your deadlines:
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {[
                    { label: '24h before', value: 1440 },
                    { label: '6h before', value: 360 },
                    { label: '2h before', value: 120 },
                    { label: '1h before', value: 60 },
                    { label: '30m before', value: 30 },
                    { label: '15m before', value: 15 }
                  ].map((preset) => {
                    const currentIntervals = settings?.reminderIntervals || [1440, 360, 120, 60, 30, 15];
                    const isActive = currentIntervals.includes(preset.value);
                    return (
                      <button
                        key={preset.value}
                        id={`interval-${preset.value}`}
                        onClick={async () => {
                          const nextIntervals = isActive
                            ? currentIntervals.filter((v) => v !== preset.value)
                            : [...currentIntervals, preset.value];
                          await updateSettings({ reminderIntervals: nextIntervals });
                        }}
                        className={`py-2 px-3 rounded-lg text-[11px] font-medium transition-all text-center border cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/30 font-semibold'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Integration Sidebars */}
        <div className="space-y-6">
          {/* Calendar connection status */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-800">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>Google Calendar Integration</span>
            </h3>

            {accessToken ? (
              <div className="space-y-3">
                <div className="bg-green-500/5 text-green-400 border border-green-500/20 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between">
                  <span>Connection Established</span>
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Your tasks will automatically populate and synchronize with your Google Calendar scheduling timelines.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  Authorize Google Calendar access to enable automatic visual schedule mapping.
                </p>
                <button
                  onClick={handleConnectCalendar}
                  className="w-full py-2 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-bold text-xs rounded-lg active:scale-95 transition-all"
                >
                  Connect Calendar
                </button>
              </div>
            )}
          </div>

          {/* AI configurations */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-800">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Gemini Settings</span>
            </h3>

            <div className="space-y-3">
              <div className="bg-indigo-950/20 border border-indigo-900/30 p-3 rounded-lg text-xs space-y-2">
                <p className="font-semibold text-white">Multi-Model Fallback Engine</p>
                <div className="flex flex-col gap-1 text-slate-400 font-mono text-[10px]">
                  <div className="flex items-center gap-1.5 text-indigo-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    <span>1. gemini-3.5-flash (Primary)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                    <span>2. gemini-3.1-flash-lite (Secondary)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                    <span>3. gemini-flash-latest (Tertiary)</span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Automatically routes requests through a high-availability fallback sequence to ensure uptime and bypass rate-limit limits gracefully.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
