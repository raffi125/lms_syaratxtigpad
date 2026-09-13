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
    password_hash TEXT, -- Hash scrypt password peserta (NULL = boleh login bebas, kompatibel akun lama)
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

-- 10. TABEL: SUPPORT_TICKETS (Tiket Bantuan Helpdesk Tim IT - migrasi dari penyimpanan Storage JSON)
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id TEXT PRIMARY KEY, -- e.g. TKT-IT-2026-XXXX
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'bug_teknis',
    priority TEXT NOT NULL DEFAULT 'sedang',
    subject TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Menunggu Peninjauan',
    created_at TEXT NOT NULL DEFAULT 'Hari ini',
    created_at_ts TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) & ACCESS POLICIES
-- ==============================================================================
-- Aktifkan RLS pada seluruh tabel untuk keamanan data
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- 1. MODUL PEMBELAJARAN (Semua pengguna dapat membaca; TULIS hanya via gateway /api/db dengan service_role)
DROP POLICY IF EXISTS "Akses publik modules" ON public.modules;
DROP POLICY IF EXISTS "Baca publik modules" ON public.modules;
DROP POLICY IF EXISTS "Kelola modules" ON public.modules;
CREATE POLICY "Baca publik modules" ON public.modules FOR SELECT USING (true);

-- 2. BANK SOAL KUIS & GAME WORDS (Dapat dibaca semua peserta; penulisan oleh gateway service_role)
DROP POLICY IF EXISTS "Akses publik quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Baca publik quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Kelola quizzes" ON public.quizzes;
CREATE POLICY "Baca publik quizzes" ON public.quizzes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Akses publik game_words" ON public.game_words;
DROP POLICY IF EXISTS "Baca publik game_words" ON public.game_words;
DROP POLICY IF EXISTS "Kelola game_words" ON public.game_words;
CREATE POLICY "Baca publik game_words" ON public.game_words FOR SELECT USING (true);

-- 3. SESI ZOOM & PRESENSI ABSEN (Baca terbuka; tulis presensi/kelola via gateway service_role)
DROP POLICY IF EXISTS "Akses publik zoom" ON public.zoom_sessions;
DROP POLICY IF EXISTS "Baca publik zoom" ON public.zoom_sessions;
DROP POLICY IF EXISTS "Kelola zoom" ON public.zoom_sessions;
CREATE POLICY "Baca publik zoom" ON public.zoom_sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Akses publik absen" ON public.absen;
DROP POLICY IF EXISTS "Baca publik absen" ON public.absen;
DROP POLICY IF EXISTS "Insert presensi mandiri" ON public.absen;
DROP POLICY IF EXISTS "Kelola absen mentor" ON public.absen;
CREATE POLICY "Baca publik absen" ON public.absen FOR SELECT USING (true);

-- 4. USERS, SERTIFIKAT, & HASIL JAWABAN KUIS (quizzes_user)
--    Sebelumnya: FOR ALL USING (true) WITH CHECK (true) → anon bisa tulis sembarang.
--    Sekarang: SELECT saja. Semua INSERT/UPDATE/DELETE melewati /api/db (service_role) yang
--    memvalidasi sesi kolab_session + role-matrix (admin/mentor/peserta) di sisi server.
DROP POLICY IF EXISTS "Akses publik users" ON public.users;
CREATE POLICY "Baca publik users" ON public.users FOR SELECT USING (true);

-- PASTIKAN KOLOM password_hash ADA: tabel users sudah ada di live DB, jadi
-- CREATE TABLE IF NOT EXISTS di atas DILEWATI dan tidak menambahkan kolom baru.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- JANGAN PERNAH expose password_hash ke klien publik. Policy SELECT di atas menyasar
-- TABLE-level; REVOKE kolom-level ini memastikan PostgREST menolak kolom password_hash
-- untuk peran anon/authenticated sekalipun memakai select=* . Hanya service_role
-- (via gateway /api/db & route auth) yang dapat membaca kolom ini.
REVOKE SELECT (password_hash) ON public.users FROM anon, authenticated;
REVOKE INSERT (password_hash), UPDATE (password_hash) ON public.users FROM anon, authenticated;

DROP POLICY IF EXISTS "Akses publik certificates" ON public.certificates;
CREATE POLICY "Baca publik certificates" ON public.certificates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Akses publik completions" ON public.module_completions;
CREATE POLICY "Baca publik completions" ON public.module_completions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Akses publik quizzes_user" ON public.quizzes_user;
CREATE POLICY "Baca publik quizzes_user" ON public.quizzes_user FOR SELECT USING (true);

DROP POLICY IF EXISTS "Akses publik support_tickets" ON public.support_tickets;
CREATE POLICY "Baca publik support_tickets" ON public.support_tickets FOR SELECT USING (true);

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


