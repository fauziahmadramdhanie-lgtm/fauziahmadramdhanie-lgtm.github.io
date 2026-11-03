# uzi-porto — scaffold

Scaffold ini sengaja belum berisi website. Isinya brief, konten, spec animasi, config, dan deploy. Website-nya dibangun Claude Code.

## Isi
- `CLAUDE.md` — brief proyek (dibaca otomatis oleh Claude Code)
- `docs/animation-spec.md` — spesifikasi 11 animasi
- `src/content.json` — semua konten. Cari `TODO` dan isi dulu
- `package.json`, `vite.config.js` — Vite + GSAP + Lenis
- `.github/workflows/deploy.yml` — auto-deploy ke GitHub Pages
- `public/assets/` — taruh foto & visual di sini (buat foldernya)

## Cara jalanin
```bash
cd uzi-porto
git init -b main
npm install
claude
```

Lalu tempel prompt ini di Claude Code:

```
Baca CLAUDE.md, docs/animation-spec.md, dan src/content.json.
Bangun website portfolio-nya sesuai urutan kerja di CLAUDE.md.
Mulai dari: index.html, src/main.js, src/styles.css (dengan design tokens dari palette di content.json),
render semua section dari content.json, lalu tambahkan animasi 1–10 satu per satu dan commit tiap selesai.
Konten yang masih TODO pakai placeholder netral, jangan mengarang; fokus ke struktur, desain, dan animasi dulu.
Setelah website jalan di localhost, ikuti docs/DEPLOY.md. Setelah selesai, jalankan npm run build dan perbaiki error,
lalu ringkas apa yang sudah jadi dan apa yang masih perlu gue isi.
```

## Sebelum publish — checklist
- [ ] Semua `TODO` di `content.json` terisi atau section-nya dihapus
- [ ] Posisi Kemendag ditulis akurat
- [ ] Tidak ada dokumen/memo internal pemerintah di studi kasus
- [ ] Foto & visual dikompres (WebP), taruh di `public/assets/`
- [ ] Cek di HP (animasi ringan & reduced-motion jalan)
- [ ] Buat repo `<username>.github.io`, push ke `main`, Settings → Pages → Source: GitHub Actions
