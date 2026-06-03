import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata = {
  title: "Sinyal — Phone Addiction Predictor",
  description:
    "Refleksi hubunganmu dengan layar. Jawab 19 pertanyaan singkat dan dapatkan indeks ketergantungan HP 1–10, faktor pendorongnya, dan langkah kecil untuk menyeimbangkan. Estimasi statistik, bukan diagnosis medis.",
};

export const viewport = {
  themeColor: "#0b0c0f",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
