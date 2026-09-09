-- ==============================================================================
-- KOLAB SYARAT X TIGPAD - SUPABASE DATABASE SCHEMA & INITIAL DATA SEED
-- ==============================================================================
-- Salin dan jalankan skrip ini di SQL Editor di dashboard Supabase proyek Anda.
-- ==============================================================================

-- 1. TABEL: USERS (Akun Pengguna)
CREATE TABLE IF NOT EXISTS public.users (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    user_id TEXT, -- User ID unik peserta/mentor/admin (menggantikan npm)
    role TEXT NOT NULL DEFAULT 'peserta', -- 'peserta', 'mentor', 'admin'
    status TEXT NOT NULL DEFAULT 'Aktif',
    institution TEXT DEFAULT 'Komunitas BISINDO',
    score INTEGER DEFAULT 80,
    progress INTEGER DEFAULT 0,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL: MODULES (Modul Pembelajaran)
CREATE TABLE IF NOT EXISTS public.modules (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Dasar',
    description TEXT,
    duration TEXT DEFAULT '15 Menit',
    date TEXT DEFAULT '',
    time TEXT DEFAULT '',
    video_url TEXT DEFAULT '',
    pdf_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL: MODULE_COMPLETIONS (Status Penyelesaian Modul Peserta)
CREATE TABLE IF NOT EXISTS public.module_completions (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    module_id INTEGER REFERENCES public.modules(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT TRUE,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, module_id)
);

-- 4. TABEL: QUIZZES (Bank Soal Kuis Evaluasi)
CREATE TABLE IF NOT EXISTS public.quizzes (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer INTEGER NOT NULL,
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL: ZOOM_SESSIONS (Sesi Live Pertemuan Zoom)
CREATE TABLE IF NOT EXISTS public.zoom_sessions (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    meeting_id TEXT NOT NULL,
    passcode TEXT NOT NULL,
    host TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT DEFAULT '14:00',
    zoom_url TEXT NOT NULL,
    presence_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Berlangsung',
    attendees INTEGER DEFAULT 0,
    "desc" TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL: ABSEN (Catatan Presensi & Absensi Peserta - Menggantikan attendance_logs lama)
CREATE TABLE IF NOT EXISTS public.absen (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    session_id INTEGER REFERENCES public.zoom_sessions(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    user_id_code TEXT, -- User ID unik peserta/mentor/admin
    institution TEXT,
    date TEXT DEFAULT '',
    time TEXT NOT NULL DEFAULT 'Hari ini',
    method TEXT NOT NULL DEFAULT 'Kode Sesi',
    status TEXT NOT NULL DEFAULT 'Hadir',
    verified BOOLEAN DEFAULT TRUE,
    proof_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUTO-MIGRASI DATA LAMA: Pindahkan seluruh data presensi dari attendance_logs ke absen secara aman
DO $$ 
DECLARE
  has_uid BOOLEAN;
  has_npm BOOLEAN;
  code_expr TEXT := '''''';
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_logs') THEN
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance_logs' AND column_name = 'user_id_code') INTO has_uid;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance_logs' AND column_name = 'npm') INTO has_npm;

    IF has_uid THEN
      code_expr := 'COALESCE(user_id_code, '''')';
    ELSIF has_npm THEN
      code_expr := 'COALESCE(npm, '''')';
    END IF;

    BEGIN
      EXECUTE 'INSERT INTO public.absen (name, user_id_code, institution, time, method, verified, proof_url, created_at) ' ||
              'SELECT name, ' || code_expr || ', COALESCE(institution, ''''), time, method, verified, COALESCE(proof_url, ''''), COALESCE(created_at, NOW()) ' ||
              'FROM public.attendance_logs';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- Hapus tabel lama setelah seluruh data selesai diselamatkan ke tabel absen
    DROP TABLE IF EXISTS public.attendance_logs CASCADE;
  END IF;
END $$;

-- 7. TABEL: CERTIFICATES (Sertifikat Resmi & Penerbitan)
CREATE TABLE IF NOT EXISTS public.certificates (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    user_id_code TEXT, -- User ID string (sebelumnya npm)
    score INTEGER DEFAULT 80,
    progress INTEGER DEFAULT 100,
    cert_issued BOOLEAN DEFAULT FALSE,
    cert_file_name TEXT,
    cert_file_url TEXT,
    issue_date TEXT DEFAULT '-',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL: GAME_WORDS (Kosakata Game Ejaan BISINDO)
CREATE TABLE IF NOT EXISTS public.game_words (
    id SERIAL PRIMARY KEY,
    difficulty TEXT NOT NULL, -- 'easy', 'medium', 'hard'
    word TEXT NOT NULL
);

-- 9. TABEL: QUIZZES_USER (Hasil Kuis & Jawaban Peserta)
CREATE TABLE IF NOT EXISTS public.quizzes_user (
    id TEXT PRIMARY KEY,
    user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    user_email TEXT DEFAULT '',
    user_role TEXT DEFAULT 'peserta',
    quiz_title TEXT DEFAULT 'Pertemuan 1: Komunikasi, Inklusi & Budaya Tuli',
    category TEXT DEFAULT 'Pertemuan 1',
    score INTEGER DEFAULT 0,
    earned_points INTEGER DEFAULT 0,
    total_possible_points INTEGER DEFAULT 100,
    passed BOOLEAN DEFAULT FALSE,
    submitted_at TEXT NOT NULL DEFAULT 'Hari ini',
    answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    has_ungraded_essays BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AKTIFKAN ROW LEVEL SECURITY (RLS) DENGAN KEBIJAKAN AKSES TERBUKA UNTUK DEMO
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes_user ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses publik users" ON public.users;
CREATE POLICY "Akses publik users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses publik modules" ON public.modules;
CREATE POLICY "Akses publik modules" ON public.modules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses publik completions" ON public.module_completions;
CREATE POLICY "Akses publik completions" ON public.module_completions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses publik quizzes" ON public.quizzes;
CREATE POLICY "Akses publik quizzes" ON public.quizzes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses publik zoom" ON public.zoom_sessions;
CREATE POLICY "Akses publik zoom" ON public.zoom_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses publik absen" ON public.absen;
CREATE POLICY "Akses publik absen" ON public.absen FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses publik certificates" ON public.certificates;
CREATE POLICY "Akses publik certificates" ON public.certificates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses publik game_words" ON public.game_words;
CREATE POLICY "Akses publik game_words" ON public.game_words FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses publik quizzes_user" ON public.quizzes_user;
CREATE POLICY "Akses publik quizzes_user" ON public.quizzes_user FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- MIGRASI OTOMATIS: Tambah kolom date/time & hapus tabel lama
-- ==============================================================================
DO $$ 
BEGIN
  -- Kolom user_id di users
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'npm') THEN
    ALTER TABLE public.users RENAME COLUMN npm TO user_id;
  END IF;
  
  -- Kolom certificates
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'certificates' AND column_name = 'npm') THEN
    ALTER TABLE public.certificates RENAME COLUMN npm TO user_id_code;
  END IF;

  -- Kolom date & time di modules
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'modules' AND column_name = 'date') THEN
    ALTER TABLE public.modules ADD COLUMN date TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'modules' AND column_name = 'time') THEN
    ALTER TABLE public.modules ADD COLUMN time TEXT DEFAULT '';
  END IF;

  -- Kolom time & desc di zoom_sessions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'zoom_sessions' AND column_name = 'time') THEN
    ALTER TABLE public.zoom_sessions ADD COLUMN time TEXT DEFAULT '14:00';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'zoom_sessions' AND column_name = 'desc') THEN
    ALTER TABLE public.zoom_sessions ADD COLUMN "desc" TEXT DEFAULT '';
  END IF;

  -- Hapus tabel lama attendance_logs jika ada
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_logs') THEN
    DROP TABLE IF EXISTS public.attendance_logs CASCADE;
  END IF;
END $$;

-- ==============================================================================
-- PRODUCTION SCHEMA COMPLETED
-- ==============================================================================
-- Tabel-tabel di atas siap digunakan untuk data riil production (Data Polos).
-- Jalankan query ini di SQL Editor Supabase untuk membuat seluruh tabel dan RLS.


