/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task } from '../types';

export const googleCalendarService = {
  createEvent: async (task: Task, accessToken: string): Promise<string | null> => {
    try {
      const startDateTime = task.recommendedStartTime || new Date().toISOString();
      const endDateTime = new Date(new Date(startDateTime).getTime() + (task.estimatedHours || 1) * 60 * 60 * 1000).toISOString();

      const event = {
        summary: `[DeadlineAI] ${task.title}`,
        description: `${task.description}\n\nPriority: ${task.priority.toUpperCase()}\nEnergy Level: ${task.energyLevel.toUpperCase()}\nCategory: ${task.category}`,
        start: {
          dateTime: startDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        },
        end: {
          dateTime: endDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 },
            { method: 'popup', minutes: 30 },
            { method: 'popup', minutes: 10 }
          ]
        }
      };

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (!res.ok) {
        if (res.status === 401 && typeof window !== 'undefined') {
          console.warn('[Calendar Service] Access token expired or invalid (401). Clearing token.');
          localStorage.removeItem('deadline_google_access_token');
        }
        const errorText = await res.text();
        console.error('Google Calendar event creation failed:', errorText);
        return null;
      }

      const data = await res.json();
      return data.id || null;
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      return null;
    }
  },

  updateEvent: async (task: Task, accessToken: string): Promise<boolean> => {
    if (!task.calendarEventId) return false;
    try {
      const startDateTime = task.recommendedStartTime || new Date().toISOString();
      const endDateTime = new Date(new Date(startDateTime).getTime() + (task.estimatedHours || 1) * 60 * 60 * 1000).toISOString();

      const event = {
        summary: `[DeadlineAI] ${task.title}`,
        description: `${task.description}\n\nPriority: ${task.priority.toUpperCase()}\nEnergy Level: ${task.energyLevel.toUpperCase()}\nCategory: ${task.category}`,
        start: {
          dateTime: startDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        },
        end: {
          dateTime: endDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        }
      };

      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${task.calendarEventId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (!res.ok) {
        if (res.status === 401 && typeof window !== 'undefined') {
          console.warn('[Calendar Service] Access token expired or invalid (401) during update. Clearing token.');
          localStorage.removeItem('deadline_google_access_token');
        }
        const errorText = await res.text();
        console.error('Google Calendar event update failed:', errorText);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      return false;
    }
  },

  deleteEvent: async (calendarEventId: string, accessToken: string): Promise<boolean> => {
    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${calendarEventId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!res.ok && res.status !== 404) {
        if (res.status === 401 && typeof window !== 'undefined') {
          console.warn('[Calendar Service] Access token expired or invalid (401) during delete. Clearing token.');
          localStorage.removeItem('deadline_google_access_token');
        }
        const errorText = await res.text();
        console.error('Google Calendar event delete failed:', errorText);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      return false;
    }
  }
};
