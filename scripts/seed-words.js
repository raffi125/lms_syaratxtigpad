// Script untuk memasukkan / seed data kata game BISINDO ke Supabase
// Jalankan dengan: node scripts/seed-words.js

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GAME_WORDS = [
  // EASY (10 kata)
  { difficulty: "easy", word: "IBU" },
  { difficulty: "easy", word: "AIR" },
  { difficulty: "easy", word: "AYAH" },
  { difficulty: "easy", word: "BUKU" },
  { difficulty: "easy", word: "SUSU" },
  { difficulty: "easy", word: "NASI" },
  { difficulty: "easy", word: "BOLA" },
  { difficulty: "easy", word: "ADIK" },
  { difficulty: "easy", word: "MATA" },
  { difficulty: "easy", word: "APEL" },

  // MEDIUM (9 kata)
  { difficulty: "medium", word: "RUMAH" },
  { difficulty: "medium", word: "MAKAN" },
  { difficulty: "medium", word: "KUCING" },
  { difficulty: "medium", word: "KAMAR" },
  { difficulty: "medium", word: "KAKAK" },
  { difficulty: "medium", word: "SEPEDA" },
  { difficulty: "medium", word: "PISANG" },
  { difficulty: "medium", word: "BANGKU" },
  { difficulty: "medium", word: "MOBIL" },

  // HARD (6 kata)
  { difficulty: "hard", word: "SEKOLAH" },
  { difficulty: "hard", word: "JENDELA" },
  { difficulty: "hard", word: "KOMPUTER" },
  { difficulty: "hard", word: "LAPANGAN" },
  { difficulty: "hard", word: "MATAHARI" },
  { difficulty: "hard", word: "PERPUSTAKAAN" },
];

async function seedWords() {
  console.log("Sedang memasukkan data kata ke Supabase...");
  
  // Hapus data lama (opsional)
  await supabase.from("game_words").delete().neq("id", 0);

  const { data, error } = await supabase.from("game_words").insert(GAME_WORDS).select();

  if (error) {
    console.error("Gagal memasukkan data:", error.message);
  } else {
    console.log(`Berhasil memasukkan ${data.length} kata ke tabel game_words!`);
  }
}

seedWords();
