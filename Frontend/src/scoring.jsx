// scoring.jsx — field config + DEMO mock model (NOT a real model)
// Exposes window.SCORING

// ── Field catalogue ────────────────────────────────────────────────
// direction: 'up' = higher value pushes score UP (more addiction)
//            'down' = higher value pushes score DOWN (protective)
//            null = not scored
// weight: contribution magnitude (in score points) at full deviation
const FIELDS = {
  Age:                    { label: "Usia", unit: "thn", min: 1, max: 100, step: 1, integer: true, direction: null },
  Gender:                 { label: "Gender", type: "segment", options: ["Male", "Female", "Other"], optionLabels: ["Laki-laki", "Perempuan", "Lainnya"], direction: null },

  Daily_Usage_Hours:      { label: "Jam pakai HP / hari", unit: "jam", min: 0, max: 24, step: 0.5, direction: "up",   weight: 1.6, pivot: 4, half: 6, icon: "smartphone" },
  Weekend_Usage_Hours:    { label: "Jam pakai akhir pekan", unit: "jam", min: 0, max: 24, step: 0.5, direction: "up",   weight: 1.1, pivot: 5, half: 7, icon: "smartphone" },
  Phone_Checks_Per_Day:   { label: "Cek HP / hari", unit: "x", min: 0, max: 500, step: 5, integer: true, direction: "up", weight: 1.2, pivot: 60, half: 140, icon: "smartphone" },
  Apps_Used_Daily:        { label: "Jumlah app / hari", unit: "app", min: 0, max: 100, step: 1, integer: true, direction: "up", weight: 0.5, pivot: 18, half: 40, icon: "smartphone" },
  Phone_Usage_Purpose:    { label: "Tujuan pakai HP", type: "select", options: ["Browsing", "Education", "Gaming", "Social Media", "Other"], optionLabels: ["Browsing", "Edukasi", "Gaming", "Medsos", "Lainnya"], direction: "cat",
                            catWeights: { Browsing: 0.2, Education: -0.5, Gaming: 0.7, "Social Media": 0.7, Other: 0 } },

  Time_on_Social_Media:   { label: "Medsos", unit: "jam", min: 0, max: 24, step: 0.5, direction: "up",   weight: 1.4, pivot: 2, half: 5, icon: "users" },
  Time_on_Gaming:         { label: "Game", unit: "jam", min: 0, max: 24, step: 0.5, direction: "up",   weight: 1.0, pivot: 1.5, half: 5, icon: "activity" },
  Time_on_Education:      { label: "Edukasi", unit: "jam", min: 0, max: 24, step: 0.5, direction: "down", weight: 0.7, pivot: 1.5, half: 4, icon: "activity" },
  Screen_Time_Before_Bed: { label: "Layar sebelum tidur", unit: "jam", min: 0, max: 24, step: 0.5, direction: "up", weight: 1.2, pivot: 1, half: 3, icon: "moon" },
  Exercise_Hours:         { label: "Olahraga", unit: "jam", min: 0, max: 24, step: 0.5, direction: "down", weight: 0.9, pivot: 1, half: 3, icon: "activity" },

  Sleep_Hours:            { label: "Jam tidur", unit: "jam", min: 0, max: 24, step: 0.5, direction: "down", weight: 1.3, pivot: 7.5, half: 3, icon: "moon" },
  Anxiety_Level:          { label: "Kecemasan", unit: "/10", min: 0, max: 10, step: 1, direction: "up",   weight: 0.8, pivot: 5, half: 5, icon: "heart" },
  Depression_Level:       { label: "Depresi", unit: "/10", min: 0, max: 10, step: 1, direction: "up",   weight: 0.8, pivot: 5, half: 5, icon: "heart" },
  Self_Esteem:            { label: "Harga diri", unit: "/10", min: 0, max: 10, step: 1, direction: "down", weight: 0.6, pivot: 5, half: 5, icon: "heart" },
  Interllectual_Performance: { label: "Performa intelektual", unit: "/100", min: 0, max: 100, step: 1, direction: "down", weight: 0.5, pivot: 60, half: 40, icon: "activity" },

  Social_Interactions:    { label: "Interaksi sosial / hari", unit: "x", min: 0, max: 20, step: 1, direction: "down", weight: 0.8, pivot: 5, half: 8, icon: "users" },
  Family_Communication:   { label: "Komunikasi keluarga", unit: "x", min: 0, max: 20, step: 1, direction: "down", weight: 0.8, pivot: 5, half: 8, icon: "message" },
};

const STEPS = [
  { id: "demografi", title: "Demografi", subtitle: "Sedikit tentang kamu", icon: "users",
    fields: ["Age", "Gender"] },
  { id: "pemakaian", title: "Pemakaian HP", subtitle: "Kebiasaan harianmu", icon: "smartphone",
    fields: ["Daily_Usage_Hours", "Weekend_Usage_Hours", "Phone_Checks_Per_Day", "Apps_Used_Daily", "Phone_Usage_Purpose"] },
  { id: "aktivitas", title: "Aktivitas", subtitle: "Jam per hari", icon: "activity",
    fields: ["Time_on_Social_Media", "Time_on_Gaming", "Time_on_Education", "Screen_Time_Before_Bed", "Exercise_Hours"] },
  { id: "kesehatan", title: "Tidur & Mental", subtitle: "Kondisi istirahat & batinmu", icon: "moon",
    fields: ["Sleep_Hours", "Anxiety_Level", "Depression_Level", "Self_Esteem", "Interllectual_Performance"] },
  { id: "sosial", title: "Interaksi Sosial", subtitle: "Koneksi di dunia nyata", icon: "message",
    fields: ["Social_Interactions", "Family_Communication"] },
];

const DEFAULTS = {
  Age: 24, Gender: "Male",
  Daily_Usage_Hours: 6, Weekend_Usage_Hours: 8, Phone_Checks_Per_Day: 90, Apps_Used_Daily: 22, Phone_Usage_Purpose: "Social Media",
  Time_on_Social_Media: 3.5, Time_on_Gaming: 1.5, Time_on_Education: 1, Screen_Time_Before_Bed: 1.5, Exercise_Hours: 0.5,
  Sleep_Hours: 6.5, Anxiety_Level: 5, Depression_Level: 4, Self_Esteem: 5, Interllectual_Performance: 65,
  Social_Interactions: 6, Family_Communication: 5,
};

const BASE = 3.6;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// signed contribution of one field, in score points
function fieldContribution(key, value) {
  const f = FIELDS[key];
  if (!f) return 0;
  if (f.direction === "cat") return f.catWeights[value] ?? 0;
  if (f.direction !== "up" && f.direction !== "down") return 0;
  const pivot = f.pivot ?? (f.min + f.max) / 2;
  const half = f.half ?? (Math.max(f.max - pivot, pivot - f.min) || 1);
  const dev = clamp((value - pivot) / half, -1, 1);
  const sign = f.direction === "up" ? 1 : -1;
  return sign * f.weight * dev;
}

function computeScore(values) {
  let sum = BASE;
  for (const key in FIELDS) sum += fieldContribution(key, values[key]);
  return clamp(sum, 1, 10);
}

function categoryOf(score) {
  if (score < 4) return { category: "low", label: "Rendah" };
  if (score < 7) return { category: "medium", label: "Sedang" };
  return { category: "high", label: "Tinggi" };
}

const HUMAN = {
  Daily_Usage_Hours: "Jam pakai HP / hari", Weekend_Usage_Hours: "Jam pakai akhir pekan",
  Phone_Checks_Per_Day: "Cek HP / hari", Apps_Used_Daily: "Jumlah app / hari",
  Phone_Usage_Purpose: "Tujuan pakai HP", Time_on_Social_Media: "Waktu di medsos",
  Time_on_Gaming: "Waktu main game", Time_on_Education: "Waktu edukasi",
  Screen_Time_Before_Bed: "Layar sebelum tidur", Exercise_Hours: "Olahraga",
  Sleep_Hours: "Jam tidur", Anxiety_Level: "Tingkat kecemasan", Depression_Level: "Tingkat depresi",
  Self_Esteem: "Harga diri", Interllectual_Performance: "Performa intelektual",
  Social_Interactions: "Interaksi sosial langsung", Family_Communication: "Komunikasi keluarga",
};

const REC_TEMPLATES = {
  Daily_Usage_Hours:      { text: "Pasang batas layar harian, mulai dari −30 menit.", icon: "smartphone" },
  Weekend_Usage_Hours:    { text: "Rencanakan satu kegiatan offline tiap akhir pekan.", icon: "activity" },
  Phone_Checks_Per_Day:   { text: "Matikan notifikasi non-esensial untuk kurangi cek HP.", icon: "smartphone" },
  Apps_Used_Daily:        { text: "Rapikan layar utama; sisakan app yang benar-benar perlu.", icon: "smartphone" },
  Time_on_Social_Media:   { text: "Kurangi waktu medsos 30 menit per hari.", icon: "users" },
  Time_on_Gaming:         { text: "Tetapkan jadwal main game yang tetap, bukan spontan.", icon: "activity" },
  Screen_Time_Before_Bed: { text: "Matikan layar 1 jam sebelum tidur.", icon: "moon" },
  Phone_Usage_Purpose:    { text: "Geser pemakaian ke tujuan produktif atau edukatif.", icon: "smartphone" },
  Sleep_Hours:            { text: "Targetkan 7–8 jam tidur yang konsisten.", icon: "moon" },
  Exercise_Hours:         { text: "Tambah 20 menit aktivitas fisik tiap hari.", icon: "activity" },
  Anxiety_Level:          { text: "Coba latihan napas singkat saat cemas memuncak.", icon: "heart" },
  Depression_Level:       { text: "Bicarakan perasaanmu dengan orang yang dipercaya.", icon: "heart" },
  Self_Esteem:            { text: "Catat satu hal yang kamu syukuri tiap malam.", icon: "heart" },
  Social_Interactions:    { text: "Tambah interaksi sosial langsung minimal sekali sehari.", icon: "users" },
  Family_Communication:   { text: "Sisihkan waktu ngobrol tanpa HP bersama keluarga.", icon: "message" },
};

function computeResult(values) {
  const score = computeScore(values);
  const addiction_level = Math.round(score * 10) / 10;
  const { category, label } = categoryOf(addiction_level);

  // drivers (exclude unscored + age/gender)
  const drivers = [];
  for (const key in FIELDS) {
    const f = FIELDS[key];
    if (f.direction == null) continue;
    const contribution = Math.round(fieldContribution(key, values[key]) * 100) / 100;
    if (Math.abs(contribution) < 0.01) continue;
    drivers.push({
      key, human_label: HUMAN[key] || f.label, contribution,
      direction: contribution > 0 ? "increases" : "decreases",
      numeric: f.direction !== "cat",
      min: f.min, max: f.max, step: f.step, integer: !!f.integer, unit: f.unit,
    });
  }
  drivers.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const topUp = drivers.filter((d) => d.direction === "increases").slice(0, 4);
  const recommendations = (topUp.length ? topUp : drivers.slice(0, 2)).map((d) => REC_TEMPLATES[d.key]).filter(Boolean).slice(0, 4);

  const lead = topUp[0] ? topUp[0].human_label.toLowerCase() : "pola pemakaianmu";
  let interpretation;
  if (category === "high")
    interpretation = `Tingkat ketergantungan kamu tergolong tinggi. Faktor terbesar yang menaikkan skor adalah ${lead}. Perubahan kecil yang konsisten bisa menurunkannya.`;
  else if (category === "medium")
    interpretation = `Tingkat ketergantungan kamu tergolong sedang. ${topUp[0] ? "Perhatikan terutama " + lead + "." : "Pola umummu masih seimbang."} Beberapa penyesuaian ringan sudah cukup membantu.`;
  else
    interpretation = `Tingkat ketergantungan kamu tergolong rendah. Pola pemakaianmu cukup sehat — pertahankan kebiasaan baik yang sudah berjalan.`;

  return { addiction_level, category, category_label: label, interpretation, recommendations, drivers };
}

window.SCORING = {
  FIELDS, STEPS, DEFAULTS, HUMAN,
  computeScore, computeResult, categoryOf, fieldContribution, clamp,
};
