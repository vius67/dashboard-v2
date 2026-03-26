-- Run this in your Supabase SQL editor to set up all tables
-- Go to: Supabase Dashboard → SQL Editor → New Query → paste this → Run

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- TIMETABLE
create table if not exists timetable (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  teacher text not null,
  room text not null,
  start_time text not null,
  end_time text not null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  color text not null,
  created_at timestamptz default now()
);

alter table timetable enable row level security;
create policy "Users can manage their own timetable"
  on timetable for all using (auth.uid() = user_id);

-- HOMEWORK
create table if not exists homework (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  title text not null,
  description text default '',
  due_date text not null,
  status text not null default 'not-started',
  color text not null,
  created_at timestamptz default now()
);

alter table homework enable row level security;
create policy "Users can manage their own homework"
  on homework for all using (auth.uid() = user_id);

-- TODOS
create table if not exists todos (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  completed boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz default now()
);

alter table todos enable row level security;
create policy "Users can manage their own todos"
  on todos for all using (auth.uid() = user_id);

-- PAST PAPERS
create table if not exists past_papers (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  title text not null default '',
  date text not null,
  score numeric not null,
  max_score numeric not null,
  percentage numeric not null,
  created_at timestamptz default now()
);

alter table past_papers enable row level security;
create policy "Users can manage their own past papers"
  on past_papers for all using (auth.uid() = user_id);
