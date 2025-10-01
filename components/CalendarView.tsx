import React from 'react';
import { CalendarEvent } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

interface CalendarViewProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  events: CalendarEvent[];
}

const toYYYYMMDD = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ currentDate, setCurrentDate, selectedDate, setSelectedDate, events }) => {
  const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
  const daysOfWeek = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const eventsByDate = events.reduce((acc, event) => {
    (acc[event.date] = acc[event.date] || []).push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  const selectedDateString = toYYYYMMDD(selectedDate);
  const eventsForSelectedDay = eventsByDate[selectedDateString] || [];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  const today = new Date();
  const todayString = toYYYYMMDD(today);

  return (
    <div className="rounded-2xl p-px bg-gradient-to-br from-teal-400 to-blue-600 h-full shadow-2xl shadow-blue-500/10">
      <div className="bg-slate-900 rounded-[15px] p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-slate-800 transition-colors">
            <ChevronLeftIcon className="w-6 h-6 text-slate-400" />
          </button>
          <h2 className="text-xl font-bold text-slate-100 text-center">
            {monthNames[month]} {year}
          </h2>
          <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-slate-800 transition-colors">
            <ChevronRightIcon className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-slate-400 mb-2">
          {daysOfWeek.map(day => <div key={day}>{day}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, day) => {
            const dayNumber = day + 1;
            const date = new Date(year, month, dayNumber);
            const dateString = toYYYYMMDD(date);
            const isSelected = dateString === selectedDateString;
            const isToday = dateString === todayString;
            const hasEvents = !!eventsByDate[dateString];

            return (
              <div key={dayNumber} className="relative flex justify-center">
                  <button
                  onClick={() => setSelectedDate(date)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors text-sm
                      ${isSelected ? 'bg-blue-600 text-white font-bold' : ''}
                      ${!isSelected && isToday ? 'bg-blue-500/10 text-blue-300 font-bold' : ''}
                      ${!isSelected && !isToday ? 'text-slate-300 hover:bg-slate-800' : ''}`}
                  >
                  {dayNumber}
                  </button>
                  {hasEvents && (
                      <div className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-slate-900' : 'bg-blue-400'}`} />
                  )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 border-t border-slate-700 pt-4 flex-grow overflow-y-auto">
          <h3 className="font-bold text-slate-100 mb-3">Eventi del {selectedDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}</h3>
          {eventsForSelectedDay.length > 0 ? (
            <ul className="space-y-3">
              {eventsForSelectedDay.map(event => (
                <li key={event.id} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <div className="w-1.5 h-10 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>
                  <div>
                    <p className="font-semibold text-slate-100">{event.title}</p>
                    <p className="text-sm text-slate-400">{event.time}{event.description && ` - ${event.description}`}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">Nessun evento per questa data.</p>
          )}
        </div>
      </div>
    </div>
  );
};