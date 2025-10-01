import { useState, useEffect, useCallback } from 'react';
import { CalendarEvent } from '../types';

const CALENDAR_STORAGE_KEY = 'smartCalendarEvents';

export const useCalendar = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    try {
      const storedEvents = localStorage.getItem(CALENDAR_STORAGE_KEY);
      if (storedEvents) {
        setEvents(JSON.parse(storedEvents));
      }
    } catch (error) {
      console.error("Failed to load events from localStorage", error);
    }
  }, []);

  const saveEvents = useCallback((updatedEvents: CalendarEvent[]) => {
    try {
      localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(updatedEvents));
      setEvents(updatedEvents);
    } catch (error) {
      console.error("Failed to save events to localStorage", error);
    }
  }, []);

  const addEvent = useCallback((event: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = { ...event, id: Date.now().toString() };
    const updatedEvents = [...events, newEvent].sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA.getTime() - dateB.getTime();
    });
    saveEvents(updatedEvents);
    return newEvent;
  }, [events, saveEvents]);

  const deleteEventByTitle = useCallback((title: string) => {
    const lowerCaseTitle = title.toLowerCase();
    const eventToDelete = events.find(e => e.title.toLowerCase().includes(lowerCaseTitle));
    if (eventToDelete) {
        const updatedEvents = events.filter((event) => event.id !== eventToDelete.id);
        saveEvents(updatedEvents);
        return eventToDelete;
    }
    return null;
  }, [events, saveEvents]);

  const getEventsForDate = useCallback((date: string) => { // date format YYYY-MM-DD
    return events.filter(event => event.date === date);
  }, [events]);

  return { events, addEvent, deleteEventByTitle, getEventsForDate };
};