# Deploy: hosting & domain

## Keputusan yang sudah dipilih
- Username GitHub: `portofauzi`
- Nama repo: `portofauzi.github.io` (harus persis ini supaya jadi user site)
- URL: `https://portofauzi.github.io`
- `BASE_PATH` di `deploy.yml` tetap `/`, jangan diubah.

## Keputusan default (gratis)
- **Hosting:** GitHub Pages (static, gratis, HTTPS otomatis). Alternatif: Vercel atau Cloudflare Pages (juga gratis, build otomatis dari GitHub).
- **Domain:** mulai dengan `https://<username>.github.io`. Domain custom opsional, bisa ditambah kapan saja tanpa bongkar website.
- **CI/CD:** `.github/workflows/deploy.yml` — tiap push ke `main` otomatis build & publish.

## Tahap 1 — Cek lokal
1. `npm run build` tanpa error, lalu `npm run preview`.
2. Cek di HP (Chrome DevTools device mode) dan mode reduced-motion.
3. Lighthouse: Performance ≥ 90, Accessibility ≥ 95.
4. Tidak ada teks `TODO`/"Placeholder" yang masih tampil.

## Tahap 2 — Repo GitHub
Pilih salah satu:
- **User site (disarankan):** buat repo bernama persis `<username>.github.io`. URL jadi `https://<username>.github.io`. `BASE_PATH` di workflow tetap `/`.
- **Project site:** repo bernama bebas, mis. `porto`. URL jadi `https://<username>.github.io/porto/`. Ubah `BASE_PATH` di `deploy.yml` jadi `/porto/`.

```bash
git add . && git commit -m "init portfolio"
git remote add origin git@github.com:<username>/<repo>.git
git push -u origin main
```

## Tahap 3 — Aktifkan Pages
GitHub repo → Settings → Pages → Source: **GitHub Actions**. Tab Actions menunjukkan progres; setelah hijau, situs live (biasanya 1–2 menit).

## Tahap 4 (opsional) — Domain custom
1. Beli domain di registrar pilihan (harga beda-beda per ekstensi, cek langsung di registrar; `.id`/`.my.id`/`.com` umum dipakai).
2. Buat file `public/CNAME` berisi satu baris, mis. `fauzi.my.id`. Commit & push.
3. Di DNS registrar:
   - Apex domain (`fauzi.my.id`): 4 record **A** ke `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `www`: record **CNAME** ke `<username>.github.io`
4. GitHub → Settings → Pages → Custom domain: isi domain, tunggu verifikasi DNS, lalu centang **Enforce HTTPS**.
5. Di `content.json` update `meta.url` ke domain baru.

Catatan: propagasi DNS bisa sampai beberapa jam. Cek IP GitHub terbaru di dokumentasi GitHub Pages sebelum setting.

## Tahap 5 — Setelah live
- [ ] Update link portfolio di LinkedIn (Featured), CV, bio irfolks
- [ ] Tambah `meta` Open Graph + gambar preview (1200×630) supaya link cantik saat dibagikan
- [ ] Daftarkan di Google Search Console (opsional)
- [ ] Update konten bertahap lewat `src/content.json`, tiap push otomatis terdeploy

## Otomatisasi jumlah artikel irfolks
- Angka "Articles on irfolks" dibaca dari `https://irfolks.com/rss.xml` (satu `<item>` = satu artikel) oleh `scripts/irfolks-count.mjs`, hasilnya di `src/irfolks.json`.
- Skrip jalan otomatis sebelum setiap `npm run build` (`prebuild`). Kalau irfolks tidak bisa dibaca, angka terakhir dipakai dan build tetap jalan.
- `deploy.yml` juga build ulang tiap 6 jam (`schedule`), jadi artikel baru ikut terhitung tanpa push apa pun. Mau langsung hitung ulang: Actions → Deploy → Run workflow.
- Cek manual: `npm run irfolks`. Tes: `npm test`.

## Rollback
GitHub → Actions → pilih run sukses sebelumnya → Re-run, atau `git revert <commit>` lalu push.
