import { supabase } from './supabase';
import { ClassPeriod, Homework, TodoItem, PastPaperResult, CalendarEvent } from '../app/types';

/**
 * Use getSession() instead of getUser() — getSession() reads from local storage
 * and never acquires the auth lock, so concurrent calls can't race each other.
 * getUser() makes a network request every time AND acquires the lock, which is
 * what causes the "lock was stolen" error when multiple service calls fire at once.
 */
async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  return session.user.id;
}

// ─── Timetable ───────────────────────────────────────────────────
export const timetableService = {
  async getAll(): Promise<ClassPeriod[]> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('timetable').select('*').eq('user_id', userId)
      .order('day_of_week').order('start_time');
    if (error) throw error;
    return (data ?? []).map(r => ({
      id: r.id, subject: r.subject, teacher: r.teacher, room: r.room,
      startTime: r.start_time, endTime: r.end_time, dayOfWeek: r.day_of_week, color: r.color,
    }));
  },

  async upsert(p: ClassPeriod): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('timetable').upsert({
      id: p.id, user_id: userId, subject: p.subject, teacher: p.teacher,
      room: p.room, start_time: p.startTime, end_time: p.endTime,
      day_of_week: p.dayOfWeek, color: p.color,
    });
    if (error) throw error;
  },

  async replaceAll(periods: ClassPeriod[]): Promise<void> {
    const userId = await getUserId();

    // Wipe all existing classes for this user first
    const { error: delError } = await supabase
      .from('timetable')
      .delete()
      .eq('user_id', userId);
    if (delError) throw delError;

    // Insert the new batch (skip if empty)
    if (!periods.length) return;
    const { error: insError } = await supabase
      .from('timetable')
      .insert(periods.map(p => ({
        id: p.id,
        user_id: userId,
        subject: p.subject,
        teacher: p.teacher,
        room: p.room,
        start_time: p.startTime,
        end_time: p.endTime,
        day_of_week: p.dayOfWeek,
        color: p.color,
      })));
    if (insError) throw insError;
  },

  async delete(id: string): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('timetable').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },
};

// ─── Homework ────────────────────────────────────────────────────
export const homeworkService = {
  async getAll(): Promise<Homework[]> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('homework').select('*').eq('user_id', userId).order('due_date');
    if (error) throw error;
    return (data ?? []).map(r => ({
      id: r.id, subject: r.subject, title: r.title, description: r.description ?? '',
      dueDate: r.due_date, status: r.status as Homework['status'], color: r.color,
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

// ─── Todos ───────────────────────────────────────────────────────
export const todoService = {
  async getAll(): Promise<TodoItem[]> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('todos').select('*').eq('user_id', userId).order('created_at');
    if (error) throw error;
    return (data ?? []).map(r => ({
      id: r.id, text: r.text, completed: r.completed, createdAt: r.created_at,
    }));
  },

  async add(t: TodoItem): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('todos').insert({
      id: t.id, user_id: userId, text: t.text,
      completed: t.completed, created_at: t.createdAt,
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
};

// ─── Past Papers ─────────────────────────────────────────────────
export const pastPaperService = {
  async getAll(): Promise<PastPaperResult[]> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('past_papers').select('*').eq('user_id', userId).order('date');
    if (error) throw error;
    return (data ?? []).map(r => ({
      id: r.id, subject: r.subject, title: r.title ?? '',
      date: r.date, score: r.score, maxScore: r.max_score, percentage: r.percentage,
    }));
  },

  async add(r: PastPaperResult): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('past_papers').insert({
      id: r.id, user_id: userId, subject: r.subject, title: r.title,
      date: r.date, score: r.score, max_score: r.maxScore, percentage: r.percentage,
    });
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('past_papers').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },
};

// ─── Calendar Events ─────────────────────────────────────────────
export const calendarService = {
  async getAll(): Promise<CalendarEvent[]> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('calendar_events').select('*').eq('user_id', userId).order('date').order('time');
    if (error) throw error;
    return (data ?? []).map(r => ({
      id: r.id, title: r.title, date: r.date,
      time: r.time ?? undefined, endTime: r.end_time ?? undefined,
      type: r.type as CalendarEvent['type'],
      subject: r.subject ?? undefined, color: r.color,
      description: r.description ?? undefined,
    }));
  },

  async add(e: CalendarEvent): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('calendar_events').insert({
      id: e.id, user_id: userId, title: e.title, date: e.date,
      time: e.time ?? null, end_time: e.endTime ?? null, type: e.type,
      subject: e.subject ?? null, color: e.color, description: e.description ?? null,
    });
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('calendar_events').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },
};
