import { supabase } from './supabase';
import { ClassPeriod, Homework, TodoItem, PastPaperResult } from '../app/types';

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export const timetableService = {
  async getAll(): Promise<ClassPeriod[]> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('timetable')
      .select('*')
      .eq('user_id', userId)
      .order('day_of_week', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(row => ({
      id: row.id,
      subject: row.subject,
      teacher: row.teacher,
      room: row.room,
      startTime: row.start_time,
      endTime: row.end_time,
      dayOfWeek: row.day_of_week,
      color: row.color,
    }));
  },
  async upsert(period: ClassPeriod): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('timetable').upsert({
      id: period.id, user_id: userId, subject: period.subject,
      teacher: period.teacher, room: period.room,
      start_time: period.startTime, end_time: period.endTime,
      day_of_week: period.dayOfWeek, color: period.color,
    });
    if (error) throw error;
  },
  async delete(id: string): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('timetable').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },
  async replaceAll(periods: ClassPeriod[]): Promise<void> {
    const userId = await getUserId();
    await supabase.from('timetable').delete().eq('user_id', userId);
    if (periods.length === 0) return;
    const { error } = await supabase.from('timetable').insert(
      periods.map(p => ({
        id: p.id, user_id: userId, subject: p.subject, teacher: p.teacher,
        room: p.room, start_time: p.startTime, end_time: p.endTime,
        day_of_week: p.dayOfWeek, color: p.color,
      }))
    );
    if (error) throw error;
  },
};

export const homeworkService = {
  async getAll(): Promise<Homework[]> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('homework').select('*').eq('user_id', userId).order('due_date', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(row => ({
      id: row.id, subject: row.subject, title: row.title,
      description: row.description, dueDate: row.due_date,
      status: row.status as Homework['status'], color: row.color,
    }));
  },
  async upsert(hw: Homework): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('homework').upsert({
      id: hw.id, user_id: userId, subject: hw.subject, title: hw.title,
      description: hw.description, due_date: hw.dueDate, status: hw.status, color: hw.color,
    });
    if (error) throw error;
  },
  async updateStatus(id: string, status: Homework['status']): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('homework').update({ status }).eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },
  async delete(id: string): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('homework').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },
};

export const todoService = {
  async getAll(): Promise<TodoItem[]> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('todos').select('*').eq('user_id', userId).order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(row => ({
      id: row.id, text: row.text, completed: row.completed, createdAt: row.created_at,
    }));
  },
  async add(todo: TodoItem): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('todos').insert({
      id: todo.id, user_id: userId, text: todo.text,
      completed: todo.completed, created_at: todo.createdAt,
    });
    if (error) throw error;
  },
  async toggle(id: string, completed: boolean): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('todos').update({ completed }).eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },
  async delete(id: string): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('todos').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },
  async replaceAll(todos: TodoItem[]): Promise<void> {
    const userId = await getUserId();
    await supabase.from('todos').delete().eq('user_id', userId);
    if (todos.length === 0) return;
    const { error } = await supabase.from('todos').insert(
      todos.map(t => ({
        id: t.id, user_id: userId, text: t.text,
        completed: t.completed, created_at: t.createdAt,
      }))
    );
    if (error) throw error;
  },
};

export const pastPaperService = {
  async getAll(): Promise<PastPaperResult[]> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('past_papers').select('*').eq('user_id', userId).order('date', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(row => ({
      id: row.id, subject: row.subject, date: row.date,
      score: row.score, maxScore: row.max_score, percentage: row.percentage,
    }));
  },
  async add(result: PastPaperResult): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('past_papers').insert({
      id: result.id, user_id: userId, subject: result.subject,
      date: result.date, score: result.score, max_score: result.maxScore, percentage: result.percentage,
    });
    if (error) throw error;
  },
  async delete(id: string): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('past_papers').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },
};
