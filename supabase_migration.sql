-- ============================================================
-- Student Dashboard – Run once in Supabase SQL Editor
-- ============================================================
create extension if not exists "uuid-ossp";

-- TIMETABLE (now with week column for Week A / Week B)
create table if not exists timetable (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null, teacher text not null, room text not null,
  start_time text not null, end_time text not null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  color text not null,
  week text check (week in ('A', 'B')),  -- NULL = legacy (no week)
  created_at timestamptz default now()
);
alter table timetable enable row level security;
drop policy if exists "timetable_rls" on timetable;
create policy "timetable_rls" on timetable for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- If you already ran the old migration, just add the week column:
-- alter table timetable add column if not exists week text check (week in ('A', 'B'));

-- HOMEWORK
create table if not exists homework (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null, title text not null, description text default '',
  due_date text not null, status text not null default 'not-started',
  color text not null, created_at timestamptz default now()
);
alter table homework enable row level security;
drop policy if exists "homework_rls" on homework;
create policy "homework_rls" on homework for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- TODOS
create table if not exists todos (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null, completed boolean not null default false,
  created_at timestamptz not null, updated_at timestamptz default now()
);
alter table todos enable row level security;
drop policy if exists "todos_rls" on todos;
create policy "todos_rls" on todos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PAST PAPERS
create table if not exists past_papers (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null, title text not null default '',
  date text not null, score numeric not null,
  max_score numeric not null, percentage numeric not null,
  created_at timestamptz default now()
);
alter table past_papers enable row level security;
drop policy if exists "past_papers_rls" on past_papers;
create policy "past_papers_rls" on past_papers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- CALENDAR EVENTS
create table if not exists calendar_events (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, date text not null,
  time text, end_time text,
  type text not null default 'event',
  subject text, color text not null, description text,
  created_at timestamptz default now()
);
alter table calendar_events enable row level security;
drop policy if exists "calendar_rls" on calendar_events;
create policy "calendar_rls" on calendar_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
