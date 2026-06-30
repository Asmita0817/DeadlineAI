/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { signInWithGoogle, signInAsGuest, googleSigningIn, authLoading } = useApp();
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      await signInAsGuest();
    } catch (error: any) {
      console.error('Demo Login failed:', error);
      toast.error(error.message || 'Demo Login failed');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 text-white mb-4 shadow-lg shadow-cyan-500/20">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Deadline<span className="text-cyan-400">AI</span>
          </h1>
          <p className="text-sm text-slate-400 font-medium">
            "The Last-Minute Life Saver" &bull; AI Chief of Staff
          </p>
        </div>

        <div className="space-y-6">
          {/* Premium Google Sign In Button */}
          <button
            onClick={signInWithGoogle}
            disabled={authLoading || googleSigningIn || demoLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 font-bold text-sm rounded-xl transition-all shadow-xl disabled:opacity-50 cursor-pointer"
          >
            {googleSigningIn ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></div>
                <span>Connecting Securely...</span>
              </>
            ) : (
              <>
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>Sign in with Google Account</span>
              </>
            )}
          </button>

          {/* Premium Guest Button */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={authLoading || googleSigningIn || demoLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-white font-bold text-sm rounded-xl border border-slate-700/80 transition-all shadow-xl disabled:opacity-50 cursor-pointer"
          >
            {demoLoading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                <span>Activating Demo Mode...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Explore as Guest (Instant Demo)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
