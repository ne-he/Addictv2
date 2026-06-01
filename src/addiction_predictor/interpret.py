"""Turn a numeric prediction + SHAP drivers into a structured PredictionResult.

This is the "human" layer: it maps the 1-10 score to a category, writes an
interpretation, and derives personalised recommendations from the features
that pushed the score up. Kept separate from `model` so the scoring logic and
the advice copy can evolve independently.
"""

from __future__ import annotations

from . import config
from .schema import FeatureDriver, PredictionResult

_CATEGORY_LABELS = {"low": "Rendah", "medium": "Sedang", "high": "Tinggi"}

_INTERPRETATIONS = {
    "low": (
        "Tingkat ketergantungan HP tergolong RENDAH. Pola pemakaian terlihat "
        "sehat dan seimbang dengan aktivitas lain."
    ),
    "medium": (
        "Tingkat ketergantungan HP tergolong SEDANG. Ada beberapa kebiasaan "
        "yang perlu diwaspadai agar tidak meningkat."
    ),
    "high": (
        "Tingkat ketergantungan HP tergolong TINGGI. Pola pemakaian berisiko "
        "mengganggu tidur, fokus, dan interaksi sosial."
    ),
}

# Map a model feature to one actionable recommendation. Several features can
# share advice (raw + its engineered ratio); duplicates are removed at runtime.
_REC_BY_FEATURE = {
    "Daily_Usage_Hours": "Tetapkan batas total jam pakai HP harian dan pantau lewat screen-time.",
    "usage_to_sleep_ratio": "Tetapkan batas total jam pakai HP harian dan pantau lewat screen-time.",
    "Phone_Checks_Per_Day": "Kurangi frekuensi cek HP: matikan notifikasi non-penting dan kelompokkan waktu cek pesan.",
    "checks_per_hour": "Kurangi frekuensi cek HP: matikan notifikasi non-penting dan kelompokkan waktu cek pesan.",
    "Screen_Time_Before_Bed": "Hindari layar 1 jam sebelum tidur dan jauhkan HP dari tempat tidur.",
    "screen_before_bed_ratio": "Hindari layar 1 jam sebelum tidur dan jauhkan HP dari tempat tidur.",
    "late_screen_ratio": "Hindari layar 1 jam sebelum tidur dan jauhkan HP dari tempat tidur.",
    "Sleep_Hours": "Perbaiki durasi tidur ke 7-9 jam dan konsistenkan jam tidur.",
    "Time_on_Social_Media": "Batasi waktu media sosial dengan timer aplikasi.",
    "social_media_x_anxiety": "Batasi waktu media sosial dengan timer aplikasi.",
    "Time_on_Gaming": "Batasi sesi gaming, terutama menjelang malam.",
    "high_gaming_x_sleep": "Batasi sesi gaming, terutama menjelang malam.",
    "Anxiety_Level": "Skor kecemasan tinggi berkaitan dengan pemakaian; coba relaksasi dan pertimbangkan dukungan profesional.",
    "Depression_Level": "Jika suasana hati menurun berkelanjutan, pertimbangkan berbicara dengan profesional.",
    "Self_Esteem": "Bangun aktivitas yang menaikkan rasa percaya diri di luar layar.",
    "resilience_gap": "Bangun aktivitas yang menaikkan rasa percaya diri di luar layar.",
    "Exercise_Hours": "Tambah aktivitas fisik rutin; olahraga menurunkan dorongan memakai layar.",
    "Social_Interactions": "Tingkatkan interaksi tatap muka dengan teman atau keluarga.",
    "Family_Communication": "Tingkatkan interaksi tatap muka dengan teman atau keluarga.",
    "social_to_solo_ratio": "Tingkatkan interaksi tatap muka dengan teman atau keluarga.",
    "Apps_Used_Daily": "Rapikan jumlah aplikasi; hapus app yang memicu pemakaian berlebih.",
    "apps_per_hour": "Rapikan jumlah aplikasi; hapus app yang memicu pemakaian berlebih.",
    "Weekend_Usage_Hours": "Rencanakan kegiatan akhir pekan tanpa layar.",
}

_GENERIC_RECS = {
    "low": "Pertahankan kebiasaan sehat ini dan pantau waktu layar sesekali.",
    "medium": "Tetapkan jam bebas-HP harian (mis. saat makan) untuk menjaga keseimbangan.",
    "high": "Pertimbangkan detoks digital terjadwal dan dukungan dari orang terdekat.",
}


def categorize(level: float) -> str:
    """Bucket a 1-10 score into low / medium / high using config thresholds."""
    if level < config.THRESHOLD_LOW:
        return "low"
    if level >= config.THRESHOLD_HIGH:
        return "high"
    return "medium"


def recommend(
    category: str, drivers: list[FeatureDriver], max_recs: int = 4
) -> list[str]:
    """Advice tied to the features that pushed the score up, newest-driver first."""
    recs: list[str] = []
    for d in drivers:
        if d.direction != "increases":
            continue
        advice = _REC_BY_FEATURE.get(d.feature)
        if advice and advice not in recs:
            recs.append(advice)
        if len(recs) >= max_recs:
            break
    if not recs:
        recs.append(_GENERIC_RECS[category])
    return recs


def build_result(level: float, drivers: list[FeatureDriver]) -> PredictionResult:
    """Assemble the full structured response from a score and its SHAP drivers."""
    category = categorize(level)
    return PredictionResult(
        addiction_level=round(level, 2),
        category=category,
        category_label=_CATEGORY_LABELS[category],
        interpretation=_INTERPRETATIONS[category],
        recommendations=recommend(category, drivers),
        drivers=drivers,
    )
