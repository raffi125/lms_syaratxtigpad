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
    zoom_url TEXT NOT NULL,
    presence_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Berlangsung',
    attendees INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL: ATTENDANCE_LOGS (Catatan Presensi Peserta)
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    session_id INTEGER REFERENCES public.zoom_sessions(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    user_id_code TEXT, -- User ID string (sebelumnya npm)
    institution TEXT,
    time TEXT NOT NULL DEFAULT 'Hari ini',
    method TEXT NOT NULL DEFAULT 'Kode Sesi',
    verified BOOLEAN DEFAULT TRUE,
    proof_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- AKTIFKAN ROW LEVEL SECURITY (RLS) DENGAN KEBIJAKAN AKSES TERBUKA UNTUK DEMO
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Akses publik users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik modules" ON public.modules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik completions" ON public.module_completions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik quizzes" ON public.quizzes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik zoom" ON public.zoom_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik attendance" ON public.attendance_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik certificates" ON public.certificates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik game_words" ON public.game_words FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- MIGRASI OTOMATIS: Rename 'npm' menjadi 'user_id' jika sebelumnya sudah ada tabel
-- ==============================================================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'npm') THEN
    ALTER TABLE public.users RENAME COLUMN npm TO user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance_logs' AND column_name = 'npm') THEN
    ALTER TABLE public.attendance_logs RENAME COLUMN npm TO user_id_code;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'certificates' AND column_name = 'npm') THEN
    ALTER TABLE public.certificates RENAME COLUMN npm TO user_id_code;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance_logs' AND column_name = 'proof_url') THEN
    ALTER TABLE public.attendance_logs ADD COLUMN proof_url TEXT DEFAULT '';
  END IF;
END $$;

-- ==============================================================================
-- PRODUCTION SCHEMA COMPLETED
-- ==============================================================================
-- Tabel-tabel di atas siap digunakan untuk data riil production (Data Polos).
-- Jalankan query ini di SQL Editor Supabase untuk membuat seluruh tabel dan RLS.


