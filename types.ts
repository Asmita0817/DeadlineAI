/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role?: string;
}

export type Priority = 'high' | 'medium' | 'low';
export type EnergyLevel = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Task {
  id?: string;
  title: string;
  description: string;
  deadline: string; // ISO Date String
  priority: Priority;
  estimatedHours: number;
  energyLevel: EnergyLevel;
  category: string;
  status: TaskStatus;
  notes: string;
  location: string;
  tags: string[];
  userId: string;
  createdAt: string;
  updatedAt: string;
  calendarEventId?: string;
  riskScore: number; // 0 to 100
  successProbability: number; // 0 to 100
  recommendedStartTime: string; // ISO Date String
  rescuePlan?: string;
}

export interface FocusSession {
  id?: string;
  userId: string;
  taskId: string;
  taskTitle: string;
  durationMinutes: number;
  date: string; // ISO Date String
  productivityScore: number; // 1 to 10
  notes: string;
}

export interface WeeklyReport {
  id?: string;
  userId: string;
  startDate: string;
  endDate: string;
  completedCount: number;
  missedCount: number;
  summary: string;
  improvements: string;
  createdAt: string;
}

export interface UserSettings {
  userId: string;
  theme: 'dark';
  browserNotifications: boolean;
  calendarConnected: boolean;
  geminiModel: string;
  aiRemindersEnabled?: boolean;
  notificationSoundEnabled?: boolean;
  reminderIntervals?: number[]; // list of minutes before deadline
}

export interface AIHistory {
  id?: string;
  userId: string;
  prompt: string;
  response: string;
  type: 'inbox_parsing' | 'time_machine' | 'chat' | 'rescue_plan' | 'daily_brief';
  createdAt: string;
}

export interface AppNotification {
  id?: string;
  userId: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'critical';
  read: boolean;
  createdAt: string;
}
