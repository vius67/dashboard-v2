import { ClassPeriod, Homework, TodoItem, PastPaperResult } from '../types';
import { TIMETABLE_DATA, HOMEWORK_DATA, TODO_DATA, PAST_PAPER_RESULTS } from '../data/mockData';

const STORAGE_KEYS = {
  TIMETABLE: 'student-dashboard-timetable',
  HOMEWORK: 'student-dashboard-homework',
  TODO: 'student-dashboard-todo',
  PAST_PAPERS: 'student-dashboard-past-papers',
  DARK_MODE: 'student-dashboard-dark-mode',
};

export const storageService = {
  // Timetable
  getTimetable(): ClassPeriod[] {
    const stored = localStorage.getItem(STORAGE_KEYS.TIMETABLE);
    return stored ? JSON.parse(stored) : TIMETABLE_DATA;
  },
  
  saveTimetable(timetable: ClassPeriod[]): void {
    localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(timetable));
  },

  // Homework
  getHomework(): Homework[] {
    const stored = localStorage.getItem(STORAGE_KEYS.HOMEWORK);
    return stored ? JSON.parse(stored) : HOMEWORK_DATA;
  },
  
  saveHomework(homework: Homework[]): void {
    localStorage.setItem(STORAGE_KEYS.HOMEWORK, JSON.stringify(homework));
  },

  // To-Do
  getTodos(): TodoItem[] {
    const stored = localStorage.getItem(STORAGE_KEYS.TODO);
    return stored ? JSON.parse(stored) : TODO_DATA;
  },
  
  saveTodos(todos: TodoItem[]): void {
    localStorage.setItem(STORAGE_KEYS.TODO, JSON.stringify(todos));
  },

  // Past Papers
  getPastPapers(): PastPaperResult[] {
    const stored = localStorage.getItem(STORAGE_KEYS.PAST_PAPERS);
    return stored ? JSON.parse(stored) : PAST_PAPER_RESULTS;
  },
  
  savePastPapers(papers: PastPaperResult[]): void {
    localStorage.setItem(STORAGE_KEYS.PAST_PAPERS, JSON.stringify(papers));
  },

  // Dark Mode
  getDarkMode(): boolean {
    const stored = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    return stored ? JSON.parse(stored) : false;
  },
  
  saveDarkMode(isDark: boolean): void {
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, JSON.stringify(isDark));
  },
};
