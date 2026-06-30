/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import AIInbox from './pages/AIInbox';
import FocusMode from './pages/FocusMode';
import RescueMode from './pages/RescueMode';
import TimeMachine from './pages/TimeMachine';
import AIChat from './pages/AIChat';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import { Toaster } from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';

function AppContent() {
  const { user, authLoading } = useApp();

  // Unified elegant loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center animate-spin">
            <RefreshCw className="w-6 h-6 text-white" />
          </div>
          <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase animate-pulse">
            Authenticating credentials...
          </p>
        </div>
      </div>
    );
  }

  // Redirect to login if user not authenticated
  if (!user) {
    return <LoginPage />;
  }

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/inbox" element={<AIInbox />} />
        <Route path="/focus" element={<FocusMode />} />
        <Route path="/rescue" element={<RescueMode />} />
        <Route path="/time-machine" element={<TimeMachine />} />
        <Route path="/chat" element={<AIChat />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppContent />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0f172a',
              color: '#f8fafc',
              border: '1px solid #1e293b',
              fontSize: '12px'
            }
          }}
        />
      </BrowserRouter>
    </AppProvider>
  );
}
