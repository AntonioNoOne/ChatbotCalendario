export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  title: string;
  description?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  isHtml?: boolean;
}

export interface Settings {
    wakeWord: string;
    dailySummaryEnabled: boolean;
    dailySummaryTime: string; // HH:MM
}

export enum AiAction {
    CREATE_EVENT = 'create_event',
    READ_EVENTS = 'read_events',
    SUMMARIZE_EVENTS = 'summarize_events',
    DELETE_EVENT = 'delete_event',
    OPEN_PROGRAM = 'open_program',
    GENERAL_CONVERSATION = 'general_conversation',
    UNSURE = 'unsure',
}