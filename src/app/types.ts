export interface ClassPeriod {
  id: string;
  subject: string;
  teacher: string;
  room: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  color: string;
}

export interface Homework {
  id: string;
  subject: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'not-started' | 'in-progress' | 'done';
  color: string;
}

export interface PastPaperResult {
  id: string;
  subject: string;
  title: string;
  date: string;
  score: number;
  maxScore: number;
  percentage: number;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  endTime?: string;
  type: 'exam' | 'assignment' | 'event' | 'reminder';
  subject?: string;
  color: string;
  description?: string;
}
