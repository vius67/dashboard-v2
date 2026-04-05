import { supabase } from './supabase';
import { ClassPeriod, Homework, TodoItem, PastPaperResult, CalendarEvent } from '../app/types';

async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  return session.user.id;
}

// ─── Timetable ───────────────────────────────────────────────────
export const timetableService = {
  async getAll(week?: 'A' | 'B'): Promise<ClassPeriod[]> {
    const userId = await getUserId();
    let q = supabase.from('timetable').select('*').eq('user_id', userId);
    if (week) q = q.eq('week', week);
    const { data, error } = await q.order('day_of_week').order('start_time');
    if (error) throw new Error(`Failed to load timetable: ${error.message}`);
    return (data ?? []).map(r => ({
      id: r.id,
      subject: r.subject,
      teacher: r.teacher,
      room: r.room,
      startTime: r.start_time,
      endTime: r.end_time,
      dayOfWeek: r.day_of_week,
      color: r.color,
      week: r.week as 'A' | 'B' | undefined,
    }));
  },

  async getBothWeeks(): Promise<{ weekA: ClassPeriod[]; weekB: ClassPeriod[] }> {
    const all = await timetableService.getAll();
    return {
      weekA: all.filter(c => c.week === 'A'),
      weekB: all.filter(c => c.week === 'B'),
    };
  },

  async upsert(p: ClassPeriod, week?: 'A' | 'B'): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('timetable').upsert({
      id: p.id,
      user_id: userId,
      subject: p.subject,
      teacher: p.teacher,
      room: p.room,
      start_time: p.startTime,
      end_time: p.endTime,
      day_of_week: p.dayOfWeek,
      color: p.color,
      week: week ?? (p as any).week ?? null,
    });
    if (error) throw new Error(`Failed to save class: ${error.message}`);
  },

  async replaceWeek(periods: ClassPeriod[], week: 'A' | 'B'): Promise<void> {
    const userId = await getUserId();
    const { error: delError } = await supabase
      .from('timetable')
      .delete()
      .eq('user_id', userId)
      .eq('week', week);
    if (delError) throw new Error(`Failed to clear Week ${week}: ${delError.message}`);
    if (!periods.length) return;
    const { error: insError } = await supabase.from('timetable').insert(
      periods.map(p => ({
        id: p.id,
        user_id: userId,
        subject: p.subject,
        teacher: p.teacher,
        room: p.room,
        start_time: p.startTime,
        end_time: p.endTime,
        day_of_week: p.dayOfWeek,
        color: p.color,
        week,
      }))
    );
    if (insError) throw new Error(`Failed to insert Week ${week}: ${insError.message}`);
  },

  async replaceBothWeeks(weekA: ClassPeriod[], weekB: ClassPeriod[]): Promise<void> {
    const userId = await getUserId();

    // Delete all existing timetable entries for this user
    const { error: delError } = await supabase
      .from('timetable')
      .delete()
      .eq('user_id', userId);
    if (delError) throw new Error(`Failed to clear timetable: ${delError.message}`);

    const all = [
      ...weekA.map(p => ({
        id: p.id,
        user_id: userId,
        subject: p.subject,
        teacher: p.teacher,
        room: p.room,
        start_time: p.startTime,
        end_time: p.endTime,
        day_of_week: p.dayOfWeek,
        color: p.color,
        week: 'A',
      })),
      ...weekB.map(p => ({
        id: p.id,
        user_id: userId,
        subject: p.subject,
        teacher: p.teacher,
        room: p.room,
        start_time: p.startTime,
        end_time: p.endTime,
        day_of_week: p.dayOfWeek,
        color: p.color,
        week: 'B',
      })),
    ];

    if (!all.length) return;

    const { error: insError } = await supabase.from('timetable').insert(all);
    if (insError) throw new Error(`Failed to save timetable: ${insError.message}`);
  },

  async replaceAll(periods: ClassPeriod[]): Promise<void> {
    const userId = await getUserId();
    const { error: delError } = await supabase
      .from('timetable')
      .delete()
      .eq('user_id', userId);
    if (delError) throw new Error(`Failed to clear timetable: ${delError.message}`);
    if (!periods.length) return;
    const { error: insError } = await supabase.from('timetable').insert(
      periods.map(p => ({
        id: p.id,
        user_id: userId,
        subject: p.subject,
        teacher: p.teacher,
        room: p.room,
        start_time: p.startTime,
        end_time: p.endTime,
        day_of_week: p.dayOfWeek,
        color: p.color,
        week: null,
      }))
    );
    if (insError) throw new Error(`Failed to insert classes: ${insError.message}`);
  },

  async delete(id: string): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase
      .from('timetable')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw new Error(`Failed to delete class: ${error.message}`);
  },
};

// ─── Homework ────────────────────────────────────────────────────
export const homeworkService = {
  async getAll(): Promise<Homework[]> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('homework')
      .select('*')
      .eq('user_id', userId)
      .order('due_date');
    if (error) throw new Error(`Failed to load homework: ${error.message}`);
    return (data ?? []).map(r => ({
      id: r.id,
      subject: r.subject,
      title: r.title,
      description: r.description ?? '',
      dueDate: r.due_date,
      status: r.status as Homework['status'],
      color: r.color,
    }));
  },
  async upsert(hw: Homework): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('homework').upsert({
      id: hw.id,
      user_id: userId,
      subject: hw.subject,
      title: hw.title,
      description: hw.description,
      due_date: hw.dueDate,
      status: hw.status,
      color: hw.color,
    });
    if (error) throw new Error(`Failed to save homework: ${error.message}`);
  },
  async updateStatus(id: string, status: Homework['status']): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase
      .from('homework')
      .update({ status })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw new Error(`Failed to update homework status: ${error.message}`);
  },
  async delete(id: string): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase
      .from('homework')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw new Error(`Failed to delete homework: ${error.message}`);
  },
};

// ─── Todos ───────────────────────────────────────────────────────
export const todoService = {
  async getAll(): Promise<TodoItem[]> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at');
    if (error) throw new Error(`Failed to load todos: ${error.message}`);
    return (data ?? []).map(r => ({
      id: r.id,
      text: r.text,
      completed: r.completed,
      createdAt: r.created_at,
    }));
  },
  async add(t: TodoItem): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('todos').insert({
      id: t.id,
      user_id: userId,
      text: t.text,
      completed: t.completed,
      created_at: t.createdAt,
    });
    if (error) throw new Error(`Failed to add todo: ${error.message}`);
  },
  async toggle(id: string, completed: boolean): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase
      .from('todos')
      .update({ completed })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw new Error(`Failed to update todo: ${error.message}`);
  },
  async delete(id: string): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw new Error(`Failed to delete todo: ${error.message}`);
  },
};

// ─── Past Papers ─────────────────────────────────────────────────
export const pastPaperService = {
  async getAll(): Promise<PastPaperResult[]> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('past_papers')
      .select('*')
      .eq('user_id', userId)
      .order('date');
    if (error) throw new Error(`Failed to load past papers: ${error.message}`);
    return (data ?? []).map(r => ({
      id: r.id,
      subject: r.subject,
      title: r.title ?? '',
      date: r.date,
      score: r.score,
      maxScore: r.max_score,
      percentage: r.percentage,
    }));
  },
  async add(r: PastPaperResult): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('past_papers').insert({
      id: r.id,
      user_id: userId,
      subject: r.subject,
      title: r.title,
      date: r.date,
      score: r.score,
      max_score: r.maxScore,
      percentage: r.percentage,
    });
    if (error) throw new Error(`Failed to add past paper: ${error.message}`);
  },
  async delete(id: string): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase
      .from('past_papers')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw new Error(`Failed to delete past paper: ${error.message}`);
  },
};

// ─── Study Logs ──────────────────────────────────────────────────
export interface StudyLogRow {
  id: string;
  label: string;
  subject: string;
  duration: number;
  mode: 'focus' | 'break';
  mood: 'great' | 'good' | 'okay' | 'bad' | null;
  notes: string;
  created_at: string;
}

export const studyLogService = {
  async getAll(): Promise<StudyLogRow[]> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('study_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(`Failed to load study logs: ${error.message}`);
    return (data ?? []).map(r => ({
      id: r.id,
      label: r.label,
      subject: r.subject,
      duration: r.duration,
      mode: r.mode as 'focus' | 'break',
      mood: r.mood ?? null,
      notes: r.notes ?? '',
      created_at: r.created_at,
    }));
  },

  async add(log: Omit<StudyLogRow, 'created_at'>): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('study_logs').insert({
      id: log.id,
      user_id: userId,
      label: log.label,
      subject: log.subject,
      duration: log.duration,
      mode: log.mode,
      mood: log.mood ?? null,
      notes: log.notes ?? '',
    });
    if (error) throw new Error(`Failed to save study log: ${error.message}`);
  },

  async deleteAll(): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase
      .from('study_logs')
      .delete()
      .eq('user_id', userId);
    if (error) throw new Error(`Failed to clear study logs: ${error.message}`);
  },

  async delete(id: string): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase
      .from('study_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw new Error(`Failed to delete study log: ${error.message}`);
  },
};

// ─── Calendar Events ─────────────────────────────────────────────
export const calendarService = {
  async getAll(): Promise<CalendarEvent[]> {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .order('date')
      .order('time');
    if (error) throw new Error(`Failed to load calendar events: ${error.message}`);
    return (data ?? []).map(r => ({
      id: r.id,
      title: r.title,
      date: r.date,
      time: r.time ?? undefined,
      endTime: r.end_time ?? undefined,
      type: r.type as CalendarEvent['type'],
      subject: r.subject ?? undefined,
      color: r.color,
      description: r.description ?? undefined,
    }));
  },
  async add(e: CalendarEvent): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase.from('calendar_events').insert({
      id: e.id,
      user_id: userId,
      title: e.title,
      date: e.date,
      time: e.time ?? null,
      end_time: e.endTime ?? null,
      type: e.type,
      subject: e.subject ?? null,
      color: e.color,
      description: e.description ?? null,
    });
    if (error) throw new Error(`Failed to add calendar event: ${error.message}`);
  },
  async delete(id: string): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw new Error(`Failed to delete calendar event: ${error.message}`);
  },
};
