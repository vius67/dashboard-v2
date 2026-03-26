import { ClassPeriod, Homework, PastPaperResult, TodoItem } from '../types';

export const TIMETABLE_DATA: ClassPeriod[] = [
  // Monday
  { id: '1', subject: 'Mathematics', teacher: 'Dr. Smith', room: 'A101', startTime: '09:00', endTime: '10:00', dayOfWeek: 1, color: '#8B5CF6' },
  { id: '2', subject: 'Physics', teacher: 'Mr. Johnson', room: 'B205', startTime: '10:15', endTime: '11:15', dayOfWeek: 1, color: '#3B82F6' },
  { id: '3', subject: 'English Literature', teacher: 'Ms. Williams', room: 'C304', startTime: '11:30', endTime: '12:30', dayOfWeek: 1, color: '#10B981' },
  { id: '4', subject: 'Chemistry', teacher: 'Dr. Brown', room: 'B208', startTime: '13:30', endTime: '14:30', dayOfWeek: 1, color: '#F59E0B' },
  { id: '5', subject: 'History', teacher: 'Mr. Davis', room: 'D102', startTime: '14:45', endTime: '15:45', dayOfWeek: 1, color: '#EF4444' },
  
  // Tuesday
  { id: '6', subject: 'Computer Science', teacher: 'Ms. Garcia', room: 'E301', startTime: '09:00', endTime: '10:00', dayOfWeek: 2, color: '#06B6D4' },
  { id: '7', subject: 'Mathematics', teacher: 'Dr. Smith', room: 'A101', startTime: '10:15', endTime: '11:15', dayOfWeek: 2, color: '#8B5CF6' },
  { id: '8', subject: 'Biology', teacher: 'Dr. Martinez', room: 'B210', startTime: '11:30', endTime: '12:30', dayOfWeek: 2, color: '#84CC16' },
  { id: '9', subject: 'Art & Design', teacher: 'Ms. Anderson', room: 'F101', startTime: '13:30', endTime: '14:30', dayOfWeek: 2, color: '#EC4899' },
  { id: '10', subject: 'Physical Education', teacher: 'Mr. Wilson', room: 'Gym', startTime: '14:45', endTime: '15:45', dayOfWeek: 2, color: '#14B8A6' },
  
  // Wednesday
  { id: '11', subject: 'Physics', teacher: 'Mr. Johnson', room: 'B205', startTime: '09:00', endTime: '10:00', dayOfWeek: 3, color: '#3B82F6' },
  { id: '12', subject: 'English Literature', teacher: 'Ms. Williams', room: 'C304', startTime: '10:15', endTime: '11:15', dayOfWeek: 3, color: '#10B981' },
  { id: '13', subject: 'Chemistry', teacher: 'Dr. Brown', room: 'B208', startTime: '11:30', endTime: '12:30', dayOfWeek: 3, color: '#F59E0B' },
  { id: '14', subject: 'Mathematics', teacher: 'Dr. Smith', room: 'A101', startTime: '13:30', endTime: '14:30', dayOfWeek: 3, color: '#8B5CF6' },
  { id: '15', subject: 'Geography', teacher: 'Mr. Taylor', room: 'D105', startTime: '14:45', endTime: '15:45', dayOfWeek: 3, color: '#6366F1' },
  
  // Thursday
  { id: '16', subject: 'Computer Science', teacher: 'Ms. Garcia', room: 'E301', startTime: '09:00', endTime: '10:00', dayOfWeek: 4, color: '#06B6D4' },
  { id: '17', subject: 'Biology', teacher: 'Dr. Martinez', room: 'B210', startTime: '10:15', endTime: '11:15', dayOfWeek: 4, color: '#84CC16' },
  { id: '18', subject: 'History', teacher: 'Mr. Davis', room: 'D102', startTime: '11:30', endTime: '12:30', dayOfWeek: 4, color: '#EF4444' },
  { id: '19', subject: 'Physics', teacher: 'Mr. Johnson', room: 'B205', startTime: '13:30', endTime: '14:30', dayOfWeek: 4, color: '#3B82F6' },
  { id: '20', subject: 'English Literature', teacher: 'Ms. Williams', room: 'C304', startTime: '14:45', endTime: '15:45', dayOfWeek: 4, color: '#10B981' },
  
  // Friday
  { id: '21', subject: 'Mathematics', teacher: 'Dr. Smith', room: 'A101', startTime: '09:00', endTime: '10:00', dayOfWeek: 5, color: '#8B5CF6' },
  { id: '22', subject: 'Chemistry', teacher: 'Dr. Brown', room: 'B208', startTime: '10:15', endTime: '11:15', dayOfWeek: 5, color: '#F59E0B' },
  { id: '23', subject: 'Computer Science', teacher: 'Ms. Garcia', room: 'E301', startTime: '11:30', endTime: '12:30', dayOfWeek: 5, color: '#06B6D4' },
  { id: '24', subject: 'Music', teacher: 'Mr. Lee', room: 'G201', startTime: '13:30', endTime: '14:30', dayOfWeek: 5, color: '#A855F7' },
  { id: '25', subject: 'Study Hall', teacher: 'Various', room: 'Library', startTime: '14:45', endTime: '15:45', dayOfWeek: 5, color: '#64748B' },
];

export const HOMEWORK_DATA: Homework[] = [
  {
    id: 'hw1',
    subject: 'Mathematics',
    title: 'Calculus Problem Set',
    description: 'Complete problems 1-20 from Chapter 5',
    dueDate: '2026-03-28',
    status: 'not-started',
    color: '#8B5CF6'
  },
  {
    id: 'hw2',
    subject: 'Physics',
    title: 'Lab Report - Pendulum Motion',
    description: 'Write up the lab report with graphs and analysis',
    dueDate: '2026-03-27',
    status: 'in-progress',
    color: '#3B82F6'
  },
  {
    id: 'hw3',
    subject: 'English Literature',
    title: 'Essay: Symbolism in Gatsby',
    description: '1500 word essay on symbolism in The Great Gatsby',
    dueDate: '2026-03-30',
    status: 'not-started',
    color: '#10B981'
  },
  {
    id: 'hw4',
    subject: 'Chemistry',
    title: 'Organic Chemistry Worksheets',
    description: 'Complete worksheets 3.1 and 3.2',
    dueDate: '2026-03-26',
    status: 'done',
    color: '#F59E0B'
  },
  {
    id: 'hw5',
    subject: 'Computer Science',
    title: 'Python Project - Data Structures',
    description: 'Implement binary search tree with all operations',
    dueDate: '2026-03-29',
    status: 'in-progress',
    color: '#06B6D4'
  },
  {
    id: 'hw6',
    subject: 'History',
    title: 'Research Assignment',
    description: 'Research the causes of the Industrial Revolution',
    dueDate: '2026-04-02',
    status: 'not-started',
    color: '#EF4444'
  },
];

export const PAST_PAPER_RESULTS: PastPaperResult[] = [
  { id: 'pp1', subject: 'Mathematics', title: '2025 Trial Exam', date: '2026-02-15', score: 85, maxScore: 100, percentage: 85 },
  { id: 'pp2', subject: 'Physics', title: '2025 Trial Exam', date: '2026-02-18', score: 78, maxScore: 100, percentage: 78 },
  { id: 'pp3', subject: 'Chemistry', title: '2025 Trial Exam', date: '2026-02-20', score: 92, maxScore: 100, percentage: 92 },
  { id: 'pp4', subject: 'English Literature', title: '2025 Trial Exam', date: '2026-02-22', score: 88, maxScore: 100, percentage: 88 },
  { id: 'pp5', subject: 'Computer Science', title: '2025 Trial Exam', date: '2026-02-25', score: 95, maxScore: 100, percentage: 95 },
  { id: 'pp6', subject: 'Mathematics', title: '2024 HSC Paper', date: '2026-03-01', score: 89, maxScore: 100, percentage: 89 },
  { id: 'pp7', subject: 'Physics', title: '2024 HSC Paper', date: '2026-03-03', score: 82, maxScore: 100, percentage: 82 },
  { id: 'pp8', subject: 'Chemistry', title: '2024 HSC Paper', date: '2026-03-05', score: 90, maxScore: 100, percentage: 90 },
  { id: 'pp9', subject: 'Biology', title: '2024 HSC Paper', date: '2026-03-08', score: 86, maxScore: 100, percentage: 86 },
  { id: 'pp10', subject: 'History', title: '2024 HSC Paper', date: '2026-03-10', score: 84, maxScore: 100, percentage: 84 },
  { id: 'pp11', subject: 'Mathematics', title: '2023 HSC Paper', date: '2026-03-12', score: 91, maxScore: 100, percentage: 91 },
  { id: 'pp12', subject: 'Computer Science', title: '2023 HSC Paper', date: '2026-03-15', score: 97, maxScore: 100, percentage: 97 },
];

export const TODO_DATA: TodoItem[] = [
  { id: 'todo1', text: 'Review notes for Math exam', completed: false, createdAt: '2026-03-26T09:00:00' },
  { id: 'todo2', text: 'Buy lab notebook', completed: true, createdAt: '2026-03-25T10:00:00' },
  { id: 'todo3', text: 'Email Dr. Smith about office hours', completed: false, createdAt: '2026-03-26T11:00:00' },
  { id: 'todo4', text: 'Print chemistry notes', completed: false, createdAt: '2026-03-26T12:00:00' },
  { id: 'todo5', text: 'Join study group meeting', completed: true, createdAt: '2026-03-25T14:00:00' },
];