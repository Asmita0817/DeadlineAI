/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import {
  auth,
  db,
  googleSignIn,
  logoutUser,
  initAuth,
  getAccessToken,
  setAccessToken
} from '../lib/firebase';
import { Task, FocusSession, UserSettings, AppNotification } from '../types';
import toast from 'react-hot-toast';
import { playNotificationSound } from '../utils/sound';

interface AppContextType {
  user: User | null;
  accessToken: string | null;
  authLoading: boolean;
  tasks: Task[];
  tasksLoading: boolean;
  settings: UserSettings | null;
  notifications: AppNotification[];
  activeFocusSession: FocusSession | null;
  setActiveFocusSession: (session: FocusSession | null) => void;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  googleSigningIn: boolean;
  logout: () => Promise<void>;
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  addNotification: (title: string, body: string, type: 'info' | 'warning' | 'critical') => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const getOrCreateGuestUser = () => {
  if (typeof window === 'undefined') return null;
  localStorage.setItem('deadline_guest_user', 'true');
  
  let guestId = localStorage.getItem('deadline_guest_id');
  if (!guestId) {
    let uuid = '';
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      uuid = crypto.randomUUID();
    } else {
      const arr = new Uint32Array(4);
      if (typeof window !== 'undefined' && window.crypto) {
        window.crypto.getRandomValues(arr);
      } else {
        for (let i = 0; i < 4; i++) arr[i] = Math.floor(Math.random() * 0x100000000);
      }
      uuid = Array.from(arr, dec => dec.toString(16).padStart(8, '0')).join('-');
    }
    guestId = `Guest-${uuid}`;
    localStorage.setItem('deadline_guest_id', guestId);
  }
  
  let guestDisplayName = localStorage.getItem('deadline_guest_display_name');
  if (!guestDisplayName) {
    let secureRandomNumber = 4821;
    if (typeof window !== 'undefined' && window.crypto) {
      const arr = new Uint16Array(1);
      window.crypto.getRandomValues(arr);
      secureRandomNumber = 1000 + (arr[0] % 9000);
    } else {
      secureRandomNumber = Math.floor(1000 + Math.random() * 9000);
    }
    guestDisplayName = `Guest-${secureRandomNumber}`;
    localStorage.setItem('deadline_guest_display_name', guestDisplayName);
  }

  const guestUser: any = {
    uid: guestId,
    displayName: guestDisplayName,
    email: 'guest@deadlineai.local',
    emailVerified: true,
    isAnonymous: true,
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => '',
    getIdTokenResult: async () => ({}) as any,
    reload: async () => {},
    toJSON: () => ({})
  };
  return guestUser;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeFocusSession, setActiveFocusSession] = useState<FocusSession | null>(null);

  // Initialize Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessTokenState(token);
        setAccessToken(token);
        setAuthLoading(false);
      },
      () => {
        // No Google login session, default to Guest!
        const guestUser = getOrCreateGuestUser();
        setUser(guestUser);
        setAccessTokenState(null);
        setAccessToken(null);
        setAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch Tasks for Authenticated User with Real-time listener
  useEffect(() => {
    let unsubscribeTasks: (() => void) | null = null;
    let unsubscribeNotifications: (() => void) | null = null;

    if (!user) {
      setTasks([]);
      setNotifications([]);
      return;
    }

    if (user.uid === 'guest_user' || user.uid.startsWith('Guest-')) {
      const loadGuestData = () => {
        const localTasks = localStorage.getItem('deadline_guest_tasks');
        setTasks(localTasks ? JSON.parse(localTasks) : []);

        const localNotifs = localStorage.getItem('deadline_guest_notifications');
        setNotifications(localNotifs ? JSON.parse(localNotifs) : []);

        fetchSettings();
      };
      loadGuestData();
      return;
    }

    setTasksLoading(true);
    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid),
      orderBy('deadline', 'asc')
    );

    unsubscribeTasks = onSnapshot(
      q,
      (snapshot) => {
        const list: Task[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Task);
        });
        setTasks(list);
        setTasksLoading(false);
      },
      (error) => {
        console.error('Firestore tasks subscription error:', error);
        setTasksLoading(false);
      }
    );

    // Subscribe to notifications
    const notifQ = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    unsubscribeNotifications = onSnapshot(
      notifQ,
      (snapshot) => {
        const notifList: AppNotification[] = [];
        snapshot.forEach((docSnap) => {
          notifList.push({ id: docSnap.id, ...docSnap.data() } as AppNotification);
        });
        setNotifications(notifList);
      },
      (error) => {
        console.error('Firestore notifications subscription error:', error);
      }
    );

    // Fetch focus sessions & settings
    fetchSettings();

    return () => {
      if (unsubscribeTasks) unsubscribeTasks();
      if (unsubscribeNotifications) unsubscribeNotifications();
    };
  }, [user]);

  // AI Deadline Guardian - Continuous Task Monitoring Loop
  useEffect(() => {
    if (!user || !settings || settings.aiRemindersEnabled === false || tasks.length === 0) return;

    const intervalId = setInterval(async () => {
      const storedTriggered = localStorage.getItem('deadline_triggered_reminders');
      const triggeredMap: Record<string, number[]> = storedTriggered ? JSON.parse(storedTriggered) : {};
      let updated = false;

      const activeTasks = tasks.filter(t => t.status === 'pending');
      const nowMs = Date.now();

      for (const task of activeTasks) {
        if (!task.deadline) continue;
        const deadlineMs = new Date(task.deadline).getTime();
        const minsRemaining = (deadlineMs - nowMs) / 60000;

        if (minsRemaining <= 0) continue;

        const intervals = settings.reminderIntervals || [1440, 360, 120, 60, 30, 15];
        const taskTriggered = triggeredMap[task.id] || [];

        const sortedIntervals = [...intervals].sort((a, b) => a - b);
        
        let intervalToTrigger: number | null = null;
        for (const interval of sortedIntervals) {
          if (minsRemaining <= interval) {
            if (!taskTriggered.includes(interval)) {
              intervalToTrigger = interval;
              break;
            }
          }
        }

        if (intervalToTrigger !== null) {
          taskTriggered.push(intervalToTrigger);
          triggeredMap[task.id] = taskTriggered;
          updated = true;

          try {
            const currentFocusTitle = activeFocusSession ? activeFocusSession.taskTitle : null;
            const workloadCount = activeTasks.length - 1;
            const hoursRemaining = minsRemaining / 60;

            const { aiService } = await import('../services/api');
            const reminder = await aiService.getReminder(
              task,
              new Date().toISOString(),
              workloadCount,
              currentFocusTitle,
              hoursRemaining
            );

            let type: 'info' | 'warning' | 'critical' = 'info';
            if (intervalToTrigger <= 30) {
              type = 'critical';
            } else if (intervalToTrigger <= 120 || task.successProbability < 50) {
              type = 'warning';
            }

            await addNotification(reminder.title, reminder.body, type);
            
            toast(reminder.title + '\n' + reminder.body, {
              duration: 8000,
              icon: intervalToTrigger <= 30 ? '🚨' : '🧠'
            });
          } catch (err) {
            console.error('Failed to generate guardian reminder:', err);
          }
        }
      }

      if (updated) {
        localStorage.setItem('deadline_triggered_reminders', JSON.stringify(triggeredMap));
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [user, settings, tasks, activeFocusSession]);

  const fetchTasks = async () => {
    if (!user) return;
    if (user.uid === 'guest_user' || user.uid.startsWith('Guest-')) {
      const localTasks = localStorage.getItem('deadline_guest_tasks');
      setTasks(localTasks ? JSON.parse(localTasks) : []);
      return;
    }
    setTasksLoading(true);
    try {
      const q = query(
        collection(db, 'tasks'),
        where('userId', '==', user.uid),
        orderBy('deadline', 'asc')
      );
      const snapshot = await getDocs(q);
      const list: Task[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Task);
      });
      setTasks(list);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks from database');
    } finally {
      setTasksLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    if (googleSigningIn) return;
    setGoogleSigningIn(true);
    try {
      localStorage.removeItem('deadline_guest_user');
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessTokenState(result.accessToken);
        setAccessToken(result.accessToken);
        toast.success(`Welcome back, ${result.user.displayName || 'User'}!`);
      }
    } catch (error: any) {
      console.error('Google Auth Failed:', error);
      if (error.code === 'auth/cancelled-popup-request') {
        toast.error('Sign-in cancelled. Pop-ups might be blocked/cancelled in this environment. Try Email Login or Guest Access!');
      } else if (error.code === 'auth/popup-closed-by-user') {
        toast.error('The sign-in popup was closed before completion. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('The sign-in popup was blocked. Please enable popups or use Email Login/Guest Access.');
      } else {
        toast.error(error.message || 'Google Sign In failed');
      }
    } finally {
      setGoogleSigningIn(false);
    }
  };

  const signInAsGuest = async () => {
    const guestUser = getOrCreateGuestUser();
    setUser(guestUser);
    toast.success('Guest Session Activated!');
  };

  const logout = async () => {
    try {
      localStorage.removeItem('deadline_guest_user');
      await logoutUser();
      const guestUser = getOrCreateGuestUser();
      setUser(guestUser);
      setAccessTokenState(null);
      setAccessToken(null);
      setSettings(null);
      toast.success('Signed out. Switched to Guest Mode!');
    } catch (error: any) {
      console.warn('Logout failed:', error);
      toast.error('Sign out failed');
    }
  };

  const addTask = async (taskData: Omit<Task, 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    try {
      const timestamp = new Date().toISOString();
      const newTask: any = {
        ...taskData,
        userId: user.uid,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      if (user.uid === 'guest_user' || user.uid.startsWith('Guest-')) {
        newTask.id = 'task_' + Math.random().toString(36).substr(2, 9);
        const currentTasks = [...tasks, newTask as Task];
        setTasks(currentTasks);
        localStorage.setItem('deadline_guest_tasks', JSON.stringify(currentTasks));
        toast.success('Task registered successfully!');
        return;
      }

      await addDoc(collection(db, 'tasks'), newTask);
      toast.success('Task registered successfully!');
    } catch (error) {
      console.error('Failed to add task:', error);
      toast.error('Database write error');
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!user) return;
    try {
      if (user.uid === 'guest_user' || user.uid.startsWith('Guest-')) {
        const currentTasks = tasks.map((t) =>
          t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
        );
        setTasks(currentTasks);
        localStorage.setItem('deadline_guest_tasks', JSON.stringify(currentTasks));
        toast.success('Task updated');
        return;
      }

      const docRef = doc(db, 'tasks', taskId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      toast.success('Task updated');
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Database update error');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!user) return;
    try {
      if (user.uid === 'guest_user' || user.uid.startsWith('Guest-')) {
        const currentTasks = tasks.filter((t) => t.id !== taskId);
        setTasks(currentTasks);
        localStorage.setItem('deadline_guest_tasks', JSON.stringify(currentTasks));
        toast.success('Task removed');
        return;
      }

      const docRef = doc(db, 'tasks', taskId);
      await deleteDoc(docRef);
      toast.success('Task removed');
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Database delete error');
    }
  };

  const fetchSettings = async () => {
    if (!user) return;
    if (user.uid === 'guest_user' || user.uid.startsWith('Guest-')) {
      const localSettings = localStorage.getItem('deadline_guest_settings');
      if (localSettings) {
        setSettings(JSON.parse(localSettings));
      } else {
        const defaultSettings: UserSettings = {
          userId: user.uid,
          theme: 'dark',
          browserNotifications: true,
          calendarConnected: false,
          geminiModel: 'gemini-3.5-flash',
          aiRemindersEnabled: true,
          notificationSoundEnabled: true,
          reminderIntervals: [1440, 360, 120, 60, 30, 15]
        };
        setSettings(defaultSettings);
        localStorage.setItem('deadline_guest_settings', JSON.stringify(defaultSettings));
      }
      return;
    }
    try {
      const q = query(collection(db, 'settings'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setSettings(snapshot.docs[0].data() as UserSettings);
      } else {
        const defaultSettings: UserSettings = {
          userId: user.uid,
          theme: 'dark',
          browserNotifications: true,
          calendarConnected: !!accessToken,
          geminiModel: 'gemini-3.5-flash',
          aiRemindersEnabled: true,
          notificationSoundEnabled: true,
          reminderIntervals: [1440, 360, 120, 60, 30, 15]
        };
        await addDoc(collection(db, 'settings'), defaultSettings);
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Settings fetch error:', error);
    }
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!user || !settings) return;
    try {
      if (user.uid === 'guest_user' || user.uid.startsWith('Guest-')) {
        const nextSettings = { ...settings, ...updates };
        setSettings(nextSettings);
        localStorage.setItem('deadline_guest_settings', JSON.stringify(nextSettings));
        toast.success('Settings updated');
        return;
      }

      const q = query(collection(db, 'settings'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        await updateDoc(doc(db, 'settings', docId), updates);
        setSettings({ ...settings, ...updates });
        toast.success('Settings updated');
      }
    } catch (error) {
      console.error('Settings update error:', error);
      toast.error('Failed to save settings');
    }
  };

  const addNotification = async (title: string, body: string, type: 'info' | 'warning' | 'critical') => {
    if (!user) return;
    try {
      const newNotification = {
        userId: user.uid,
        title,
        body,
        type,
        read: false,
        createdAt: new Date().toISOString()
      };

      if (user.uid === 'guest_user' || user.uid.startsWith('Guest-')) {
        const withId = { ...newNotification, id: 'notif_' + Math.random().toString(36).substr(2, 9) };
        const currentNotifs = [withId as AppNotification, ...notifications];
        setNotifications(currentNotifs);
        localStorage.setItem('deadline_guest_notifications', JSON.stringify(currentNotifs));
      } else {
        await addDoc(collection(db, 'notifications'), newNotification);
      }

      // Trigger standard web notification API
      if (settings?.browserNotifications && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new window.Notification(title, { body });
        } else if (Notification.permission !== 'denied') {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            new window.Notification(title, { body });
          }
        }
      }

      // Play subtle notification sound if enabled
      if (settings?.notificationSoundEnabled !== false) {
        playNotificationSound();
      }
    } catch (error) {
      console.error('Notification creation error:', error);
    }
  };

  const markNotificationRead = async (id: string) => {
    if (!user) return;
    try {
      if (user.uid === 'guest_user' || user.uid.startsWith('Guest-')) {
        const currentNotifs = notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        );
        setNotifications(currentNotifs);
        localStorage.setItem('deadline_guest_notifications', JSON.stringify(currentNotifs));
        return;
      }
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        accessToken,
        authLoading,
        tasks,
        tasksLoading,
        settings,
        notifications,
        activeFocusSession,
        setActiveFocusSession,
        signInWithGoogle,
        signInAsGuest,
        googleSigningIn,
        logout,
        fetchTasks,
        addTask,
        updateTask,
        deleteTask,
        fetchSettings,
        updateSettings,
        addNotification,
        markNotificationRead
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
