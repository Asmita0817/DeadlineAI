/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { aiService } from '../services/api';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { Send, RefreshCw, MessageSquare, BrainCircuit, User, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  id?: string;
  sender: 'user' | 'assistant';
  text: string;
  createdAt: string;
}

export default function AIChat() {
  const { tasks, user } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Load chat messages from Firestore
  useEffect(() => {
    if (!user) return;

    if (user.uid === 'guest_user' || user.uid.startsWith('Guest-')) {
      const localHistory = localStorage.getItem('deadline_guest_ai_history');
      const allHistory = localHistory ? JSON.parse(localHistory) : [];
      const chatHistory = allHistory.filter((item: any) => item.type === 'chat');
      const list: Message[] = [];
      chatHistory.forEach((data: any) => {
        list.push({
          sender: 'user',
          text: data.prompt,
          createdAt: data.createdAt
        });
        list.push({
          sender: 'assistant',
          text: JSON.parse(data.response).reply,
          createdAt: data.createdAt
        });
      });
      setMessages(list);
      return;
    }

    const q = query(
      collection(db, 'ai_history'),
      where('userId', '==', user.uid),
      where('type', '==', 'chat'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Message[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Since we stored the prompt and reply together, let's expand them
        list.push({
          sender: 'user',
          text: data.prompt,
          createdAt: data.createdAt
        });
        list.push({
          sender: 'assistant',
          text: JSON.parse(data.response).reply,
          createdAt: data.createdAt
        });
      });
      setMessages(list);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !user) return;

    const userMsg = inputMessage;
    setInputMessage('');
    setLoading(true);

    try {
      // Optimistically add message to UI
      const localTime = new Date().toISOString();
      const historyForApi = messages.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const res = await aiService.sendChatMessage(userMsg, historyForApi, tasks, localTime);

      // Persist conversation block
      if (user.uid === 'guest_user' || user.uid.startsWith('Guest-')) {
        const localHistory = localStorage.getItem('deadline_guest_ai_history');
        const list = localHistory ? JSON.parse(localHistory) : [];
        const newRecord = {
          id: 'h_' + Math.random().toString(36).substr(2, 9),
          userId: user.uid,
          prompt: userMsg,
          response: JSON.stringify(res),
          type: 'chat',
          createdAt: new Date().toISOString()
        };
        list.push(newRecord);
        localStorage.setItem('deadline_guest_ai_history', JSON.stringify(list));

        // Update local state directly
        setMessages((prev) => [
          ...prev,
          { sender: 'user', text: userMsg, createdAt: newRecord.createdAt },
          { sender: 'assistant', text: res.reply, createdAt: newRecord.createdAt }
        ]);
      } else {
        await addDoc(collection(db, 'ai_history'), {
          userId: user.uid,
          prompt: userMsg,
          response: JSON.stringify(res),
          type: 'chat',
          createdAt: new Date().toISOString()
        });
      }

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'AI Chat encountered an error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-4xl mx-auto flex flex-col h-[calc(100vh-12rem)] relative">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          AI Chief of Staff Workspace Chat
        </h1>
        <p className="text-sm text-slate-400">
          Real-time cognitive conversation. Ask about your specific workload, deadlines, priorities, or what to do next.
        </p>
      </div>

      {/* Chat Container */}
      <div className="flex-grow bg-white/5 border border-white/10 rounded-3xl flex flex-col justify-between overflow-hidden shadow-xl">
        {/* Messages Stage */}
        <div className="flex-grow overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3">
              <MessageSquare className="w-10 h-10 text-slate-600" />
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-400">No current conversations active.</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                  Ask me: "What should I work on now?", "Which task is the riskiest?", or "What happens if I skip my assignment?"
                </p>
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-3 max-w-[80%] ${
                  m.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                    m.sender === 'user'
                      ? 'bg-black border-white/10 text-indigo-400'
                      : 'bg-indigo-600 border-transparent text-white'
                  }`}
                >
                  {m.sender === 'user' ? <User className="w-4 h-4" /> : <BrainCircuit className="w-4 h-4" />}
                </div>

                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-black/40 text-white rounded-tr-none border border-white/10'
                      : 'bg-white/5 text-slate-100 rounded-tl-none border border-white/5'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-3 max-w-[80%] mr-auto">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-600 border border-transparent text-white">
                <BrainCircuit className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-white/5 p-3.5 rounded-2xl text-xs text-slate-400 rounded-tl-none border border-white/5 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>AI Chief of Staff is reviewing your schedule...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Message Input controls */}
        <div className="p-4 border-t border-white/5 bg-black/40">
          <form onSubmit={handleSendMessage} className="flex gap-3 items-center">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask your AI Chief of Staff..."
              className="flex-grow bg-black/40 border border-white/10 rounded-full px-5 py-3 focus:outline-none focus:border-indigo-500 text-xs text-white placeholder-slate-650 transition-colors"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center w-10 h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full active:scale-95 transition-all disabled:opacity-50 shrink-0 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
