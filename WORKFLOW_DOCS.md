# Addictv2 — Phone Addiction Predictor
### Workflow & Dokumentasi Lengkap

Web app yang memprediksi **tingkat ketergantungan smartphone (skala 1–10)** dari
kebiasaan harian seseorang, lengkap dengan **penjelasan faktor pendorong** dan
**rekomendasi** kecil untuk menyeimbangkan.

| | |
|---|---|
| 🌐 **Coba langsung** | https://addictv2.vercel.app |
| ⚙️ **API** | https://ne-he-addictv2.hf.space/docs |
| 💻 **Kode (GitHub)** | https://github.com/ne-he/Addictv2 |
| 🟢 **Lighthouse** | 100 / 100 / 100 / 100 (desktop) |
| 📊 **Akurasi model** | Test R² 0.95 · RMSE 0.37 |

Dokumen ini punya **dua bagian** dengan gaya berbeda:
- **Bagian 1 — Penjelasan Umum** → untuk pengguna, recruiter/HRD, siapa pun (tanpa istilah teknis).
- **Bagian 2 — Penjelasan Teknis** → untuk teman, dosen, atau engineer (arsitektur + fitur + workflow lengkap).

---
---

# BAGIAN 1 — Penjelasan Umum (untuk semua orang)

## Apa ini?

**Addictv2** adalah sebuah website di mana kamu menjawab 19 pertanyaan singkat
tentang kebiasaan pakai HP dan keseharianmu, lalu sistem memberi tahu **seberapa
lekat kamu dengan ponselmu** dalam bentuk skor 1–10 — plus alasannya dan langkah
kecil untuk memperbaikinya.

Anggap saja seperti **cek kesehatan ringan untuk hubunganmu dengan layar.**

## Buat apa?

Banyak orang merasa "kayaknya kebanyakan main HP" tapi tidak punya gambaran jelas.
Addictv2 mengubah perasaan itu jadi **angka yang bisa dilihat** + **faktor mana
yang paling berpengaruh**, supaya lebih mudah sadar dan mulai berubah.

## Cara pakainya (3 langkah, ±2 menit)

1. **Buka webnya** → scroll lewat intro sinematiknya. Begitu scroll mentok, kamu
   otomatis masuk ke kuis (tanpa klik).
2. **Jawab 19 pertanyaan** — usia, jam pakai HP, jam tidur, waktu di medsos, dll.
   Cukup geser slider. Tanpa login, tanpa daftar.
3. **Lihat hasilnya** langsung di layar.

## Apa yang kamu dapat di hasil

- 🎯 **Skor 1–10** dengan jarum penunjuk (gauge) berwarna.
- 🏷️ **Level**: Rendah / Sedang / Tinggi.
- 💬 **Penjelasan** singkat dalam bahasa sehari-hari.
- 📊 **Faktor pendorong** — apa saja yang *menaikkan* skor (oranye) dan
  *menurunkan* skor (hijau), diurut dari yang paling berpengaruh.
- ✅ **Rekomendasi** — beberapa langkah kecil yang bisa dicoba.
- 🎛️ **Simulasi "bagaimana jika"** — geser faktor teratas dan lihat skornya
  bergerak langsung.

## Biar gampang dibayangin (analogi)

Di belakang layar ada sebuah **"model"** — ibarat **dokter berpengalaman yang
sudah melihat ribuan kasus**. Kamu cerita kebiasaanmu, dia memberi perkiraan
berdasarkan pola yang sudah ia pelajari. Bedanya: dia **menghitung**, bukan
mendiagnosis.

## Jujur & etis (penting)

- ⚠️ Ini **estimasi statistik**, **BUKAN** diagnosis medis atau psikologis.
- Datanya kemungkinan **sintetis** (dibuat untuk belajar), jadi perlakukan ini
  sebagai **karya portfolio teknik**, bukan alat klinis.
- 🔒 **Tidak ada data pribadi yang disimpan.** Semua perhitungan sekali jalan.

---
---

# BAGIAN 2 — Penjelasan Teknis (untuk teman / dosen / engineer)

## Ringkasan

Aplikasi **full-stack machine learning** end-to-end: dari data mentah → model
terlatih → REST API → antarmuka web interaktif → **ter-deploy publik**. Dibangun
solo, dengan penekanan pada **kualitas produksi** (bukan sekadar notebook):
satu sumber kebenaran untuk preprocessing, validasi input, explainability, tes,
CI, Docker, dan dua layanan ter-deploy yang saling terhubung.

## Tech Stack

| Lapisan | Teknologi |
|---|---|
| Model | **CatBoost** (regresi), **SHAP** native (explainability) |
| Backend / API | **FastAPI**, **Pydantic v2**, **Uvicorn** |
| Data | **pandas**, **scikit-learn**, **NumPy**, **joblib** |
| Frontend | **Next.js** (App Router), React, **Tailwind CSS**, Canvas API |
| Kualitas | **pytest** (34 tes), **ruff** (lint), **GitHub Actions** (CI) |
| Deploy | **Docker** → **Hugging Face Spaces** (API) · **Vercel** (web) |

## Arsitektur

```
                 Pengunjung (browser)
                        │  isi 19 field, submit
                        ▼
        ┌───────────────────────────────┐
        │  FRONTEND — Next.js @ Vercel   │
        │  hero sequence · wizard · hasil │
        └───────────────┬───────────────┘
                        │  fetch  POST /api/predict
                        ▼
        ┌───────────────────────────────┐
        │  Route Handler (server-side)   │  ← proxy: sembunyikan URL API + hindari CORS
        └───────────────┬───────────────┘
                        │  POST  {API_URL}/predict
                        ▼
        ┌───────────────────────────────┐
        │  BACKEND — FastAPI @ HF Spaces │
        │  Preprocessor → CatBoost → SHAP │
        └───────────────┬───────────────┘
                        │  JSON: skor, kategori, drivers, rekomendasi
                        ▼
                 ditampilkan di web
```

Dua layanan terpisah karena beda kebutuhan: **Vercel** jago menyajikan web
(Next.js) tapi tidak menjalankan Python/CatBoost; **Hugging Face Spaces**
menjalankan image Docker (Python + model). Keduanya dihubungkan lewat HTTP +
satu environment variable (`API_URL`).

## Workflow End-to-End

### A. Workflow Data → Model (sekali, saat training)
```
data/Phone_Addiction.csv
        ↓  clean      (perbaiki typo, normalisasi Gender, buang kolom sampah)
        ↓  impute     (median untuk numerik, modus untuk kategorik)
        ↓  one-hot    (Gender, Phone_Usage_Purpose)
        ↓  engineer   (10 fitur turunan: rasio, interaksi, flag)
        ↓  log1p      (kolom yang skewed)
        ↓  scale      (standardisasi)
   → 33 fitur model  →  CatBoostRegressor (params terbaik dari Optuna)
   → artifacts: catboost_model.cbm · preprocessor.pkl · model_card.json
```
**Kunci anti-bug:** seluruh transformasi di atas hidup dalam **satu kelas
`Preprocessor`**. Training memanggil `fit_transform`; API memanggil `transform`.
Karena pakai kode yang sama, **mustahil terjadi training/serving skew** (preprocessing
saat latih dan saat produksi tidak akan pernah berbeda).

### B. Workflow Permintaan (tiap kali user submit)
```
1. User isi 19 field → klik Submit
2. Frontend POST ke /api/predict (route handler Next.js)
3. Route handler teruskan ke {API_URL}/predict di Hugging Face
4. FastAPI: validasi input (Pydantic) → Preprocessor.transform → model.predict (di-clip 1–10)
5. Hitung SHAP (faktor pendorong) → tentukan kategori → susun rekomendasi
6. Balas JSON → frontend render gauge, chart, rekomendasi
   (jika API mati/tidur → frontend otomatis fallback ke model demo lokal, web tak pernah rusak)
```

## Backend — Fitur Lengkap

- **`config.py`** — satu tempat untuk semua konstanta: spesifikasi 19 fitur
  (rentang, default, tipe), path, hyperparameter, ambang kategori. Resolusi
  folder `models/` cerdas (dev / Docker / cloud).
- **`schema.py`** — model input **Pydantic v2** *di-generate dari config*, jadi
  rentang valid hanya ditulis sekali. Ada **validasi lintas-field**: total jam
  aktivitas (medsos + game + edukasi) **tidak boleh > 24 jam/hari** (otomatis 422
  kalau dilanggar).
- **`pipeline.py`** — kelas **`Preprocessor`** (sumber kebenaran tunggal, lihat
  Workflow A).
- **`model.py`** — memuat artifacts sekali, `predict()` (di-clip 1–10), dan
  `explain()` memakai **SHAP native CatBoost** (`get_feature_importance`,
  tanpa dependency `shap` eksternal).
- **`interpret.py`** — skor → kategori (Rendah <4, Sedang 4–7, Tinggi ≥7),
  teks interpretasi, dan **rekomendasi yang dipersonalisasi** dari faktor yang
  paling menaikkan skor.
- **`train.py`** — pelatihan + tulis `model_card.json` (metrik, hash data, versi).
- **API (`api/main.py`)** — FastAPI dengan endpoint:
  | Method | Path | Fungsi |
  |---|---|---|
  | GET | `/health` | cek server + metrik model |
  | GET | `/model-card` | kartu model (metrik, versi, caveat) |
  | GET | `/features` | spesifikasi 19 field untuk membangun form |
  | POST | `/predict` | satu profil → skor + kategori + drivers + rekomendasi |
  | POST | `/predict/batch` | banyak profil sekaligus (1 pass SHAP, maks 1000) |
- **Kualitas:** 34 tes pytest, lint ruff, **CI GitHub Actions** (install → lint →
  tes → smoke-train tiap push), serta **Dockerfile** siap produksi.

## Frontend — Fitur Lengkap

- **Next.js App Router** — landing SSR (kebaca Google/recruiter) + komponen
  interaktif sisi-klien.
- **Hero sinematik scroll-driven** — 125 frame gambar di-*preload* lalu digambar
  ke **`<canvas>`** mengikuti posisi scroll (teknik ala halaman produk Apple;
  bukan video, jadi mulus & tanpa lag). Scroll ke bawah memutar maju, ke atas
  mundur. Di mobile/`prefers-reduced-motion` → poster diam (hemat data).
- **Scroll-to-start** — begitu scroll mentok di dasar hero, **otomatis masuk** ke
  kuis. Di mobile tetap ada tombol.
- **Transisi "loading"** — pergantian halaman ditutup layar gelap minimalis
  (menyembunyikan reset scroll), jadi terasa disengaja, bukan patah.
- **Wizard 5 langkah** — 19 field dikelompokkan (Demografi, Pemakaian HP,
  Aktivitas, Tidur & Mental, Sosial), dengan **meter "sisa jam hari ini"** yang
  menegakkan aturan 24 jam secara langsung.
- **Halaman hasil**:
  - **ScoreGauge** — gauge 1–10 beranimasi, warna hijau→kuning→oranye per kategori.
  - **CategoryBadge** — label + warna (warna tidak pernah jadi satu-satunya sinyal → aksesibel).
  - **DriverChart** — *diverging bar* SHAP: oranye = menaikkan, hijau = menurunkan.
  - **Kartu rekomendasi** + **panel "What-if"** (geser faktor, skor bergerak live).
- **Wiring** — semua prediksi lewat satu fungsi `predict()` → route handler →
  FastAPI, dengan **fallback otomatis** ke model demo lokal bila API mati.
- **Aksesibel & cepat** — keyboard-navigable, ARIA, `prefers-reduced-motion`,
  **Lighthouse 100/100/100/100** (Performance/Accessibility/Best-Practices/SEO).

## Workflow Deployment

**API → Hugging Face Spaces (Docker)**
1. Image dibangun dari `Dockerfile` (python:3.12-slim + libgomp1 untuk CatBoost).
2. File model biner (`.cbm`, `.pkl`) disimpan via **Git LFS** (syarat HF).
3. Uvicorn bind ke **`$PORT`** (cloud-friendly); folder model dikunci lewat env
   `ADDICTION_MODELS_DIR=/app/models`.
4. Build otomatis → service live di `https://ne-he-addictv2.hf.space`.

**Web → Vercel**
1. Import repo GitHub, **Root Directory = `Frontend`**.
2. Set env **`API_URL`** = URL Space → route handler server-side memanggilnya.
3. Deploy → live di `https://addictv2.vercel.app`.

## Keputusan Teknik & Masalah yang Dipecahkan

- **Training/serving skew** → dihilangkan dengan satu kelas `Preprocessor` bersama.
- **Kolom hantu `Gender_Nan`** → 119 nilai kosong sempat jadi kategori palsu;
  diperbaiki dengan memetakan token null kembali ke NaN sebelum imputasi (33 fitur, benar).
- **Path model rusak saat `pip install`** di Docker → resolver folder `models/`
  yang cerdas + override env var.
- **Port hard-coded** → Dockerfile diubah memakai `$PORT` agar jalan di Render/HF/Railway.
- **File biner ditolak HF** → di-track via Git LFS.
- **Beda bentuk data API vs UI** → dinormalisasi di sisi klien (rekomendasi
  string→objek, key driver, panel what-if pakai field lokal) tanpa mengubah model.

## Metrik

| Split | RMSE | R² | MAE |
|---|---|---|---|
| Train | 0.158 | 0.990 | 0.097 |
| **Test** | **0.370** | **0.947** | **0.188** |

> Catatan jujur: R² test ~0.95 tidak lazim untuk data perilaku → **kuat
> mengindikasikan dataset sintetis**. Diperlakukan sebagai karya teknik, bukan
> instrumen klinis tervalidasi.

## Struktur Repo (ringkas)

```
Addictv2/
├── src/addiction_predictor/   # core package: config · schema · pipeline · model · interpret · train
├── api/main.py                # FastAPI (adapter tipis)
├── app/streamlit_app.py       # demo Streamlit (adapter tipis)
├── tests/                     # 34 tes pytest
├── models/                    # artifacts terlatih (siap pakai)
├── Frontend/                  # web Next.js (hero sequence, wizard, hasil, route handler)
├── docs/FRONTEND_DESIGN_BRIEF.md
├── Dockerfile · pyproject.toml · requirements*.txt · .github/workflows/ci.yml
└── WORKFLOW_DOCS.md           # dokumen ini
```

---

*Dibuat oleh **ne-he** (Nehemiah). Live: https://addictv2.vercel.app · Repo: https://github.com/ne-he/Addictv2*
