-- CampusVoice: Student Feedback Collection Management
-- Run this script in Supabase SQL Editor using the project owner account.
-- The backend uses a server-only privileged key, so authorization is enforced in Express.
-- RLS is enabled as defense in depth; no anon/authenticated policies are created because
-- browser clients must never access these tables directly in this custom-JWT design.

create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  full_name varchar(100) not null check (char_length(trim(full_name)) between 2 and 100),
  email varchar(254) not null unique,
  password_hash text not null,
  department varchar(100) not null default '',
  role varchar(20) not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.app_users(id) on delete restrict,
  course_name varchar(120) not null check (char_length(trim(course_name)) between 2 and 120),
  course_code varchar(30) not null default '',
  faculty_name varchar(120) not null check (char_length(trim(faculty_name)) between 2 and 120),
  rating smallint not null check (rating between 1 and 5),
  category varchar(30) not null check (category in ('teaching','course-content','resources','assessment','facilities','other')),
  comments varchar(2000) not null check (char_length(trim(comments)) between 10 and 2000),
  status varchar(20) not null default 'submitted' check (status in ('submitted','reviewed','resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feedback_student_created_idx on public.feedback(student_id, created_at desc);
create index if not exists feedback_status_created_idx on public.feedback(status, created_at desc);
create index if not exists feedback_course_name_idx on public.feedback(course_name);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_users_updated_at on public.app_users;
create trigger app_users_updated_at before update on public.app_users
for each row execute function public.set_updated_at();

drop trigger if exists feedback_updated_at on public.feedback;
create trigger feedback_updated_at before update on public.feedback
for each row execute function public.set_updated_at();

alter table public.app_users enable row level security;
alter table public.feedback enable row level security;

-- Deliberately no public RLS policies. All access goes through the Express server,
-- which uses a private server key and verifies the app's signed JWT and role.
-- Never put the service-role key in frontend code.

comment on table public.app_users is 'Application users; password_hash stores bcrypt hashes, never plaintext passwords.';
comment on table public.feedback is 'Course feedback submitted by students and reviewed by administrators.';
