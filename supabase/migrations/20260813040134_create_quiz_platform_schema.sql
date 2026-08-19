/*
# Quiz Management & Online Assessment Platform - Full Schema

## Overview
Creates the complete relational database schema for a Quiz Management & Online Assessment Platform
with admin and student roles. Supports categories, quizzes, multiple-choice questions, timed quiz
attempts, and detailed answer tracking with analytics.

## Tables Created
1. **profiles** - Extends auth.users with name, role (ADMIN/STUDENT), status (ACTIVE/INACTIVE).
2. **categories** - Quiz categories with unique names.
3. **quizzes** - Quiz definitions with difficulty, duration, passing_score, max_attempts, status, thumbnail.
4. **questions** - Multiple-choice questions with marks, explanation, difficulty.
5. **options** - Answer options with is_correct flag.
6. **attempts** - Student quiz attempts with score, percentage, counts, time_taken, status.
7. **answers** - Individual answers within attempts linking to question and selected option.

## Security (RLS)
- profiles: read own + admin; insert self; update own.
- categories/quizzes/questions/options: read by authenticated; CUD by admin only.
- attempts: read own + admin; insert/update own; delete own + admin.
- answers: read/insert via own attempt ownership; delete own + admin.

## Helpers
- is_admin() SECURITY DEFINER function checks if current user has ADMIN role.
- handle_new_user() trigger auto-creates profile row on auth signup.
- update_updated_at() trigger keeps quizzes.updated_at fresh.
*/

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  email varchar(255) UNIQUE NOT NULL,
  role varchar(20) CHECK (role IN ('ADMIN', 'STUDENT')) NOT NULL DEFAULT 'STUDENT',
  status varchar(20) CHECK (status IN ('ACTIVE', 'INACTIVE')) DEFAULT 'ACTIVE',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is an admin (defined after profiles table)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select_authenticated" ON public.categories;
CREATE POLICY "categories_select_authenticated"
ON public.categories FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "categories_insert_admin" ON public.categories;
CREATE POLICY "categories_insert_admin"
ON public.categories FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "categories_update_admin" ON public.categories;
CREATE POLICY "categories_update_admin"
ON public.categories FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "categories_delete_admin" ON public.categories;
CREATE POLICY "categories_delete_admin"
ON public.categories FOR DELETE
TO authenticated
USING (public.is_admin());

-- Quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  description text,
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  difficulty varchar(20) CHECK (difficulty IN ('EASY', 'INTERMEDIATE', 'ADVANCED')) NOT NULL,
  duration int NOT NULL,
  passing_score int NOT NULL,
  max_attempts int DEFAULT 1,
  status varchar(20) CHECK (status IN ('DRAFT', 'PUBLISHED', 'UNPUBLISHED')) DEFAULT 'DRAFT',
  thumbnail_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quizzes_select_authenticated" ON public.quizzes;
CREATE POLICY "quizzes_select_authenticated"
ON public.quizzes FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "quizzes_insert_admin" ON public.quizzes;
CREATE POLICY "quizzes_insert_admin"
ON public.quizzes FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "quizzes_update_admin" ON public.quizzes;
CREATE POLICY "quizzes_update_admin"
ON public.quizzes FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "quizzes_delete_admin" ON public.quizzes;
CREATE POLICY "quizzes_delete_admin"
ON public.quizzes FOR DELETE
TO authenticated
USING (public.is_admin());

-- Questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  marks int DEFAULT 1,
  explanation text,
  difficulty varchar(20) CHECK (difficulty IN ('EASY', 'INTERMEDIATE', 'ADVANCED')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "questions_select_authenticated" ON public.questions;
CREATE POLICY "questions_select_authenticated"
ON public.questions FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "questions_insert_admin" ON public.questions;
CREATE POLICY "questions_insert_admin"
ON public.questions FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "questions_update_admin" ON public.questions;
CREATE POLICY "questions_update_admin"
ON public.questions FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "questions_delete_admin" ON public.questions;
CREATE POLICY "questions_delete_admin"
ON public.questions FOR DELETE
TO authenticated
USING (public.is_admin());

-- Options table
CREATE TABLE IF NOT EXISTS public.options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean DEFAULT false
);

ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "options_select_authenticated" ON public.options;
CREATE POLICY "options_select_authenticated"
ON public.options FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "options_insert_admin" ON public.options;
CREATE POLICY "options_insert_admin"
ON public.options FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "options_update_admin" ON public.options;
CREATE POLICY "options_update_admin"
ON public.options FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "options_delete_admin" ON public.options;
CREATE POLICY "options_delete_admin"
ON public.options FOR DELETE
TO authenticated
USING (public.is_admin());

-- Attempts table
CREATE TABLE IF NOT EXISTS public.attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  score numeric DEFAULT 0,
  percentage numeric DEFAULT 0,
  correct_answers int DEFAULT 0,
  incorrect_answers int DEFAULT 0,
  unanswered int DEFAULT 0,
  time_taken int DEFAULT 0,
  status varchar(20) CHECK (status IN ('PASSED', 'FAILED')),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attempts_select_own_or_admin" ON public.attempts;
CREATE POLICY "attempts_select_own_or_admin"
ON public.attempts FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "attempts_insert_own" ON public.attempts;
CREATE POLICY "attempts_insert_own"
ON public.attempts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "attempts_update_own" ON public.attempts;
CREATE POLICY "attempts_update_own"
ON public.attempts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "attempts_delete_own_or_admin" ON public.attempts;
CREATE POLICY "attempts_delete_own_or_admin"
ON public.attempts FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

-- Answers table
CREATE TABLE IF NOT EXISTS public.answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid REFERENCES public.attempts(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option_id uuid REFERENCES public.options(id) ON DELETE CASCADE,
  is_correct boolean DEFAULT false
);

ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "answers_select_own_or_admin" ON public.answers;
CREATE POLICY "answers_select_own_or_admin"
ON public.answers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.attempts
    WHERE attempts.id = answers.attempt_id
    AND (attempts.user_id = auth.uid() OR public.is_admin())
  )
);

DROP POLICY IF EXISTS "answers_insert_own" ON public.answers;
CREATE POLICY "answers_insert_own"
ON public.answers FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.attempts
    WHERE attempts.id = answers.attempt_id
    AND attempts.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "answers_delete_own" ON public.answers;
CREATE POLICY "answers_delete_own"
ON public.answers FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.attempts
    WHERE attempts.id = answers.attempt_id
    AND (attempts.user_id = auth.uid() OR public.is_admin())
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quizzes_category_id ON public.quizzes(category_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON public.quizzes(status);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON public.questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_options_question_id ON public.options(question_id);
CREATE INDEX IF NOT EXISTS idx_attempts_quiz_id ON public.attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON public.attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_attempt_id ON public.answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON public.answers(question_id);

-- Trigger to auto-create profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'STUDENT')
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at on quizzes
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS quizzes_updated_at ON public.quizzes;
CREATE TRIGGER quizzes_updated_at
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
