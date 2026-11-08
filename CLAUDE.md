# Personal Portfolio — Fauzi Ahmad Ramdhani (Uzi)

Website portfolio personal. Referensi gaya & interaksi: https://mobius.framer.website (template Framer).
JANGAN menyalin teks, nama, aset, atau brand Möbius. Ambil hanya pola layout dan interaksinya.

## Tujuan
Portfolio yang membuat recruiter/hiring manager (pemerintah, BUMN, multilateral, think tank, dan perusahaan untuk peran government relations / public affairs, perdagangan & ekspor, corporate communications) langsung paham:
trade policy & institutional affairs, track record lintas institusi (BI + OJK + Kemendag), thought leadership lewat irfolks.
Bahasa konten: English utama, struktur siap ditambah Bahasa Indonesia nanti.

## Stack (gratis, static)
- Vite + vanilla JS (tanpa framework). Satu halaman, section-based.
- GSAP + ScrollTrigger untuk animasi, Lenis untuk smooth scroll.
- Hosting: GitHub Pages (workflow sudah ada di `.github/workflows/deploy.yml`).
- Semua konten dibaca dari `src/content.json`. Jangan hardcode teks di HTML/JS.

## Urutan kerja
1. `npm install`, pastikan `npm run dev` jalan.
2. Bangun markup semantik dari `src/content.json` (render lewat JS di `src/main.js`).
3. Styling di `src/styles.css`: pakai design tokens di bagian atas file itu.
4. Animasi satu per satu mengikuti `docs/animation-spec.md`, urutan dari atas. Commit tiap animasi.
5. Responsive (mobile dulu), lalu `prefers-reduced-motion`, lalu Lighthouse (target Perf ≥ 90, A11y ≥ 95).
6. Push ke GitHub, aktifkan Pages (Settings → Pages → Source: GitHub Actions).

## Aturan desain
- Tipografi: Inter (variable) dari Google Fonts / self-host, heading tebal (700–800), tracking rapat (-0.03em).
  Aksen serif untuk sub-judul (mis. "Instrument Serif").
- Palet: putih `#ffffff`, hitam `#0a0a0a`, abu `#6b6b6b`, SATU warna aksen (default `#ff6a00`, bisa diganti).
- Ruang kosong banyak, grid 12 kolom, gutter 30px desktop. Teks body max-width ~ 520px.
- Hero: nama besar full-width + satu kalimat positioning.

## Aturan konten (PENTING)
- Status Kemendag: tulis akurat sesuai `content.json` (field `current_role`). Jangan memakai kata "Staff" kecuali Uzi konfirmasi.
- Jangan publikasikan dokumen internal pemerintah (memo, notulensi, naskah belum rilis). Studi kasus hanya berisi peran, konteks umum, dan hasil yang sudah publik.
- FASE 1 = website dulu, konten belakangan. Item yang masih `TODO` JANGAN menghalangi pekerjaan: render sebagai placeholder
  netral (mis. "Placeholder title", angka "00", kotak gambar abu) supaya layout & animasi tetap bisa dites penuh.
- Jangan mengarang fakta/angka/klaim baru. Placeholder harus jelas terlihat sebagai placeholder dan mudah dicari (`TODO` / "Placeholder").
- Deploy ke `main` hanya setelah checklist di `docs/DEPLOY.md` dipenuhi (terutama: tidak ada placeholder yang tampil di produksi).
- Tidak ada testimoni fiktif. Kutipan hanya jika ada di `content.json`.

## Performa & aksesibilitas
- Semua animasi dimatikan/disederhanakan saat `prefers-reduced-motion: reduce` dan di layar < 768px (kursor custom hanya untuk pointer: fine).
- Gambar: WebP/AVIF, `loading="lazy"`, width/height eksplisit. Taruh di `public/assets/`.
- Fokus keyboard terlihat, menu overlay punya focus trap + tombol Esc, kontras ≥ 4.5:1.

## Perintah
- `npm run dev` — dev server
- `npm run build` — build ke `dist/`
- `npm run preview` — cek hasil build
