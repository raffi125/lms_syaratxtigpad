const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('File .env.local tidak ditemukan.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Supabase URL atau Key tidak ditemukan di .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

async function migrate() {
  console.log('Memeriksa status tabel public.quizzes_user...');
  const { data: testData, error: testErr } = await supabase
    .from('quizzes_user')
    .select('id')
    .limit(1);

  if (testErr) {
    console.log('STATUS: TABEL_BELUM_ADA');
    console.log(testErr.message);
    return;
  }

  console.log('Tabel public.quizzes_user DITEMUKAN. Mengunduh data dari storage...');
  const { data: storageFile, error: storageErr } = await supabase.storage
    .from('modul')
    .download('system/quiz_submissions.json');

  if (storageErr || !storageFile) {
    console.error('Gagal unduh dari storage:', storageErr?.message);
    return;
  }

  const text = await storageFile.text();
  const submissions = JSON.parse(text);
  console.log('Total data di storage:', submissions.length);

  const { data: usersData } = await supabase.from('users').select('id');
  const validUserIds = new Set((usersData || []).map((u) => Number(u.id)));

  let successCount = 0;
  const updatedStorageList = [];

  for (const s of submissions) {
    const ansMeeting = Array.isArray(s.answers) && s.answers[0]?.meeting ? String(s.answers[0].meeting).trim() : '';
    let cat = s.category && s.category !== 'Umum' ? s.category.trim() : '';
    let title = s.quizTitle && s.quizTitle !== 'Kuis Evaluasi' ? s.quizTitle.trim() : '';

    if (!cat && ansMeeting) {
      const match = ansMeeting.match(/Pertemuan\s*\d+/i);
      cat = match ? match[0] : 'Pertemuan 1';
    }
    if (!title && ansMeeting) {
      title = ansMeeting;
    }

    const finalCategory = cat || 'Pertemuan 1';
    const finalTitle = title || 'Pertemuan 1: Komunikasi, Inklusi & Budaya Tuli';

    const payload = {
      id: s.id || ('sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
      user_name: s.userName || 'Peserta',
      user_email: s.userEmail || '',
      user_role: s.userRole || 'peserta',
      quiz_title: finalTitle,
      category: finalCategory,
      score: s.score ?? 0,
      earned_points: s.earnedPoints ?? 0,
      total_possible_points: s.totalPossiblePoints ?? 100,
      passed: Boolean(s.passed),
      submitted_at: s.submittedAt || new Date().toISOString(),
      answers: s.answers || [],
      has_ungraded_essays: Boolean(s.hasUngradedEssays),
    };

    if (s.userId && validUserIds.has(Number(s.userId))) {
      payload.user_id = Number(s.userId);
    } else {
      payload.user_id = null;
    }

    const { error: insErr } = await supabase.from('quizzes_user').upsert([payload]);
    if (insErr) {
      console.error('Gagal simpan', payload.user_name, insErr.message);
    } else {
      successCount++;
      console.log('Berhasil migrasi:', payload.user_name, '| Kategori:', payload.category, '| Kuis:', payload.quiz_title);
    }

    updatedStorageList.push({
      ...s,
      category: finalCategory,
      quizTitle: finalTitle,
    });
  }

  // Update storage file juga agar tersinkronisasi rapi
  try {
    await supabase.storage
      .from('modul')
      .upload('system/quiz_submissions.json', Buffer.from(JSON.stringify(updatedStorageList, null, 2), 'utf-8'), {
        contentType: 'application/json',
        upsert: true,
      });
    console.log('✅ Storage system/quiz_submissions.json berhasil diperbarui dengan label Pertemuan 1.');
  } catch (err) {
    console.warn('Peringatan saat update storage:', err.message);
  }

  console.log('MIGRASI_SELESAI: ' + successCount + '/' + submissions.length);
}

migrate();
