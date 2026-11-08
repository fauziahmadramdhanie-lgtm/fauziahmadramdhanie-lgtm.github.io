# Animation Spec (referensi: Möbius, diadaptasi)

Library: `gsap`, `gsap/ScrollTrigger`, `lenis`. Daftarkan ScrollTrigger sekali, sambungkan Lenis ke GSAP ticker:

```js
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
```

Semua efek WAJIB dibungkus `gsap.matchMedia()`:
- `(prefers-reduced-motion: no-preference)` → animasi penuh
- `(prefers-reduced-motion: reduce)` → tampilkan konten langsung, tanpa scrub/parallax
- `(max-width: 767px)` → versi ringan (tanpa kursor, tanpa kartu bertumpuk 3D)

Kerjakan berurutan. Selector pakai atribut `data-*` biar markup bersih.

## 1. Smooth scroll — `Lenis`
`duration: 1.1`, `easing: t => 1 - Math.pow(1 - t, 3)`. Matikan saat menu overlay terbuka (`lenis.stop()` / `start()`).

## 2. Header tetap + blend
`header { position: fixed; }` dengan bar solid yang warnanya mengikuti section di bawahnya (gelap di contact/footer/menu) —
menggantikan `mix-blend-mode: difference` agar konten tidak tembus di belakang nav.
Logo kiri, tombol MENU kanan. Konten lewat di bawahnya.

## 3. Menu fullscreen
- Tombol `[data-menu-toggle]`, teks berganti MENU ↔ CLOSE di posisi yang sama.
- Overlay hitam fullscreen, 4 link besar di tengah (Work, About, Writing, Contact), `font-size: clamp(40px, 8vw, 96px)`.
- Buka: overlay fade/clip-path `inset(0 0 100% 0)` → `inset(0)` 0.6s `power3.inOut`, link muncul stagger `y: 40 → 0` 0.08s.
- Tutup: reverse. Esc menutup, focus trap aktif, `lenis.stop()` saat terbuka.

## 4. Kursor custom
- Titik hitam 14px mengikuti mouse pakai `gsap.quickTo(x/y, {duration: .35, ease:'power3'})`.
- Di atas `[data-cursor="arrow"]` (kartu klik): membesar jadi lingkaran 120px berisi panah →, `mix-blend-mode` normal.
- Hanya aktif jika `(hover: hover) and (pointer: fine)`. Sembunyikan kursor native hanya di area interaktif.

## 5. Reveal headline saat load
Pecah heading `[data-split="lines"]` jadi baris (SplitText atau manual), tiap baris `yPercent: 110 → 0` di dalam wrapper `overflow: hidden`, stagger 0.08s, `power4.out`. Paragraf di bawahnya fade+rise menyusul 0.15s.

## 6. Paragraf menyala per kata (scrub)
`[data-split="words"]`: pecah jadi `<span>` per kata, awal `opacity: .15`. Timeline `scrub: true`, `start: "top 80%"`, `end: "bottom 40%"`, `stagger: 0.1` ke `opacity: 1`. Dipakai untuk kalimat positioning di bawah hero.

## 7. Strip gambar melebar (scrub)
`[data-reveal="expand"]`: wrapper `overflow:hidden`. Dari `clip-path: inset(0 85% 0 0)` ke `inset(0 0% 0 0)` dengan `scrub: 0.6`, `start: "top 85%"`, `end: "top 25%"`. Gambar di dalamnya `scale: 1.2 → 1`. Dipakai untuk cover Publikasi/Analysis.

## 8. Angka raksasa berisi gambar + odometer
- `[data-stat]`: angka `font-size: clamp(160px, 28vw, 420px)`, `font-weight: 800`, `background: url(...) center/cover; -webkit-background-clip: text; color: transparent`.
- Odometer: tiap digit = kolom tinggi 10 baris (0–9), animasi `yPercent` ke `-(digit*10)` saat masuk viewport (`once: true`), 1.4s `power3.out`, stagger antar digit.
- Gambar background: foto/visual yang TERKAIT (peta ASEAN, pelabuhan, dokumen publik). Fallback gradient aksen jika belum ada gambar.

## 9. Marquee
CSS murni: dua grup teks identik, `@keyframes marquee { to { transform: translateX(-50%) } }`, `30s linear infinite`. Pause saat hover. Teks dari `content.json → marquee`.

## 10. Daftar baris (Publikasi / Sertifikasi)
Baris dengan border-bottom 1px, hover: background `#f4f4f4`, panah muncul di kanan (translateX -8 → 0). 3 kolom: judul / kategori / tahun.

## 11a. Meja kartu: Work (`#/work`) dan Credentials (`#/credentials`) — sudah dibangun
Bukan halaman terpisah: layer fullscreen di halaman yang sama. `src/collage.js` membuka/menutupnya (lingkaran clip-path dari link
yang diklik, route di hash, Back/Esc/Close menutup, halaman di belakang `inert`). Isinya `src/cards.js`:
- Awalnya bersih: judul besar dan satu dek kartu (tertutup) di pojok kiri bawah.
- Klik dek: kartu terbang dari dek satu per satu (stagger 0.085s, `power2.out`, 0.55s, sedikit berputar lalu lurus) dan mendarat
  tertutup di tengah layar, kiri ke kanan lalu baris berikutnya, seperti pembagian kartu Spider Solitaire. Judul meredup (`--dim`).
  Ukuran kartu 5:7 dihitung supaya semuanya muat tanpa scroll dan tanpa saling menimpa (baris dipusatkan satu per satu).
- Klik kartu: berputar 180° (`rotationY`, perspective) sambil membesar ke tengah (0.8s, `power3.inOut`) sampai menutup sebagian
  besar halaman, bukan penuh; latar digelapkan. Gambar tampil utuh dengan proporsinya sendiri; kartu tanpa gambar punya sisi
  teks. Klik kartu / latar / Close / Esc membaliknya ke tempat semula. Klik dek lagi mengumpulkan semua kartu.
- Pengecualian aturan di bawah: hanya kartu yang sedang dibuka yang menganimasikan `left/top/width/height` (satu elemen);
  deal dan collect memakai transform saja.
- `prefers-reduced-motion`: semua durasi 0 (langsung pindah). Tanpa Barba.
- Partisi (hanya Work): baris tab di atas (`content.collage` = daftar partisi `{id, label, group, cards}`; grup Institutions |
  Projects). Satu dek membagikan kartu partisi yang dipilih saja. Ganti tab: kartu lama memudar (0.25s), lalu kartu partisi baru
  dibagikan dari dek bila sebelumnya sudah dibagikan; kalau kartu sedang dibuka, ia menutup tanpa animasi dulu. Grid dihitung
  di bawah baris tab (tinggi tab ikut, di HP tab turun ke beberapa baris). Credentials tetap satu dek.

## 11. Transisi antar halaman (opsional, fase 2)
V1 = single page + anchor scroll (Lenis `scrollTo`). Bila nanti multi-halaman (halaman study case): Barba.js, fade lewat overlay abu→putih 0.5s.

## Larangan
- Jangan animasikan `top/left/width/height` kecuali dengan `clip-path`/`transform`. Gunakan transform/opacity.
- Jangan pasang efek di atas teks panjang yang dibaca (body) selain efek #6.
- Setiap `ScrollTrigger` wajib di-`kill` saat resize ulang lewat `matchMedia` context.
