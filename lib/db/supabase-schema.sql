drop table if exists activity_logs cascade;
drop table if exists announcements cascade;
drop table if exists discussions cascade;
drop table if exists messages cascade;
drop table if exists conversation_participants cascade;
drop table if exists conversations cascade;
drop table if exists notifications cascade;
drop table if exists certificates cascade;
drop table if exists reviews cascade;
drop table if exists assignment_submissions cascade;
drop table if exists assignments cascade;
drop table if exists quiz_attempts cascade;
drop table if exists questions cascade;
drop table if exists quizzes cascade;
drop table if exists lesson_progress cascade;
drop table if exists course_progress cascade;
drop table if exists enrollments cascade;
drop table if exists lessons cascade;
drop table if exists modules cascade;
drop table if exists courses cascade;
drop table if exists categories cascade;
drop table if exists users cascade;

drop type if exists user_role cascade;
drop type if exists course_level cascade;
drop type if exists lesson_type cascade;
drop type if exists question_type cascade;
drop type if exists submission_type cascade;
drop type if exists notification_type cascade;

create type user_role as enum ('student', 'instructor', 'admin');
create type course_level as enum ('beginner', 'intermediate', 'advanced');
create type lesson_type as enum ('video', 'text', 'quiz', 'assignment', 'resource', 'exam');
create type question_type as enum ('multiple_choice', 'true_false', 'fill_blank');
create type submission_type as enum ('text', 'file', 'link');
create type notification_type as enum ('enrollment', 'assignment', 'quiz', 'review', 'announcement', 'message', 'completion');

create table users (
  id serial primary key,
  email text not null unique,
  name text not null,
  password_hash text not null,
  role user_role not null default 'student',
  avatar_url text,
  bio text,
  is_active boolean not null default true,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table categories (
  id serial primary key,
  name text not null,
  slug text not null unique,
  description text,
  icon_url text,
  created_at timestamp not null default now()
);

create table courses (
  id serial primary key,
  title text not null,
  slug text not null unique,
  description text,
  short_description text,
  thumbnail_url text,
  banner_url text,
  preview_video_url text,
  instructor_id integer not null references users(id),
  category_id integer not null references categories(id),
  level course_level not null default 'beginner',
  is_published boolean not null default false,
  price real not null default 0,
  discount_price real,
  tags json default '[]'::json,
  requirements json default '[]'::json,
  outcomes json default '[]'::json,
  prerequisites json default '[]'::json,
  faqs json default '[]'::json,
  has_certificate boolean not null default true,
  certificate_template text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table modules (
  id serial primary key,
  course_id integer not null references courses(id) on delete cascade,
  title text not null,
  description text,
  position integer not null default 0,
  created_at timestamp not null default now()
);

create table lessons (
  id serial primary key,
  module_id integer not null references modules(id) on delete cascade,
  title text not null,
  type lesson_type not null default 'video',
  content text,
  video_url text,
  pdf_url text,
  resource_url text,
  downloadable_files json default '[]'::json,
  thumbnail_url text,
  duration integer,
  position integer not null default 0,
  is_free boolean not null default false,
  is_exam boolean not null default false,
  created_at timestamp not null default now()
);

create table enrollments (
  id serial primary key,
  user_id integer not null references users(id),
  course_id integer not null references courses(id),
  enrolled_at timestamp not null default now(),
  completed_at timestamp,
  unique(user_id, course_id)
);

create table course_progress (
  id serial primary key,
  user_id integer not null references users(id),
  course_id integer not null references courses(id),
  progress_percent real not null default 0,
  last_lesson_id integer,
  updated_at timestamp not null default now(),
  unique(user_id, course_id)
);

create table lesson_progress (
  id serial primary key,
  user_id integer not null references users(id),
  lesson_id integer not null references lessons(id),
  completed_at timestamp not null default now(),
  unique(user_id, lesson_id)
);

create table quizzes (
  id serial primary key,
  course_id integer not null references courses(id) on delete cascade,
  lesson_id integer,
  title text not null,
  description text,
  time_limit integer,
  passing_score real not null default 70,
  is_final_exam boolean not null default false,
  shuffle_questions boolean not null default false,
  max_attempts integer default 3,
  created_at timestamp not null default now()
);

create table questions (
  id serial primary key,
  quiz_id integer not null references quizzes(id) on delete cascade,
  text text not null,
  type question_type not null default 'multiple_choice',
  options json default '[]'::json,
  correct_answer text,
  explanation text,
  image_url text,
  position integer not null default 0,
  points integer not null default 1,
  created_at timestamp not null default now()
);

create table quiz_attempts (
  id serial primary key,
  quiz_id integer not null references quizzes(id),
  user_id integer not null references users(id),
  score real not null,
  passed boolean not null,
  answers json default '[]'::json,
  time_spent integer,
  created_at timestamp not null default now()
);

create table assignments (
  id serial primary key,
  course_id integer not null references courses(id) on delete cascade,
  lesson_id integer,
  title text not null,
  description text,
  instructions text,
  rubric json default '[]'::json,
  due_date timestamp not null,
  max_score integer not null default 100,
  submission_type submission_type not null default 'text',
  allowed_file_types json default '[]'::json,
  is_final_exam boolean not null default false,
  created_at timestamp not null default now()
);

create table assignment_submissions (
  id serial primary key,
  assignment_id integer not null references assignments(id) on delete cascade,
  user_id integer not null references users(id),
  content text not null,
  file_url text,
  link_url text,
  grade integer,
  feedback text,
  submitted_at timestamp not null default now(),
  graded_at timestamp
);

create table reviews (
  id serial primary key,
  course_id integer not null references courses(id) on delete cascade,
  user_id integer not null references users(id),
  rating integer not null,
  comment text,
  instructor_reply text,
  created_at timestamp not null default now(),
  unique(user_id, course_id)
);

create table certificates (
  id serial primary key,
  user_id integer not null references users(id),
  course_id integer not null references courses(id),
  issued_at timestamp not null default now(),
  credential_id text not null unique,
  unique(user_id, course_id)
);

create table notifications (
  id serial primary key,
  user_id integer not null references users(id),
  type notification_type not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamp not null default now()
);

create table conversations (
  id serial primary key,
  created_at timestamp not null default now()
);

create table conversation_participants (
  id serial primary key,
  conversation_id integer not null references conversations(id) on delete cascade,
  user_id integer not null references users(id)
);

create table messages (
  id serial primary key,
  conversation_id integer not null references conversations(id) on delete cascade,
  sender_id integer not null references users(id),
  content text not null,
  created_at timestamp not null default now()
);

create table discussions (
  id serial primary key,
  course_id integer not null references courses(id) on delete cascade,
  user_id integer not null references users(id),
  content text not null,
  parent_id integer,
  created_at timestamp not null default now()
);

create table announcements (
  id serial primary key,
  title text not null,
  body text not null,
  target_role text,
  created_by integer not null references users(id),
  created_at timestamp not null default now()
);

create table activity_logs (
  id serial primary key,
  user_id integer references users(id),
  action text not null,
  entity_type text,
  entity_id integer,
  details text,
  created_at timestamp not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit)
values ('course-assets', 'course-assets', true, 2147483648)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;
