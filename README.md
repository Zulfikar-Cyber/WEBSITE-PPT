# Aqidah & Tauhid — Cinematic Web Presentation

Presentasi web statis yang disusun dari PowerPoint **AKIDAH (2).pptx**. Isi materi tetap bersumber dari PPT asli kelompok; desain, latar foto, animasi, dan navigasinya disesuaikan untuk pengalaman presentasi web yang lebih sinematik dan responsif.

## Struktur

```text
aqidah-tauhid-web/
├── index.html
├── assets/
│   └── pattern.svg
├── css/
│   └── style.css
└── js/
    ├── materi.js         (isi presentasi: edit di sini)
    ├── scenes.js         (12 dunia visual, satu per slide, digambar dengan SVG + CSS)
    ├── animations.js     (urutan opening, masuk/keluar slide, warna latar)
    ├── presentation.js   (render slide, navigasi, daftar slide)
    └── fx.js             (debu cahaya, pusaran partikel opening, parallax, tilt 3D kartu)
```

## Jalankan secara lokal

Cukup buka `index.html` di browser (bisa juga lewat Live Server). Animasi dan latar tidak memakai library maupun foto dari internet. Satu-satunya sumber eksternal adalah Google Fonts (Manrope, Playfair Display, DM Mono); bila offline, browser memakai font cadangan dan tampilan tetap rapi.

## Navigasi

- `←` / `→`: slide sebelumnya / berikutnya.
- `Space` / `Page Down` / `Page Up`: navigasi slide.
- `Home` / `End`: slide pertama / terakhir.
- `O`: buka daftar slide dan pilih slide langsung.
- `F`: masuk atau keluar fullscreen.
- Tombol switch di kanan bawah mengurangi atau mengaktifkan kembali animasi.
- Di HP, swipe kiri/kanan atau pakai tombol panah untuk pindah slide.

## Edit materi

Semua isi presentasi berada di `js/materi.js`. Objek materi disusun dengan urutan slide dari PPT. Desain dan kode animasi terpisah, jadi perubahan isi biasanya cukup dilakukan pada file tersebut. Properti yang dipakai antara lain:

- `tipe`: `pembuka`, `anggota`, `materi`, `tujuan`, `kesimpulan`, `referensi`, atau `penutup`.
- `judul`, `subjudul`, `paragraf`, `poin`.

Jangan menghapus tanda koma antarobjek JavaScript. Setelah mengedit, refresh halaman dan cek di desktop serta HP.

## Hosting Cloudflare Pages

Ini proyek **static HTML/CSS/JavaScript** tanpa framework atau langkah build.

### Deploy via GitHub

1. Upload isi folder proyek ke repository GitHub.
2. Di Cloudflare Dashboard, buka **Workers & Pages → Create application → Pages → Import an existing Git repository**.
3. Pilih repository.
4. Pada konfigurasi build, pilih build command `exit 0` (atau biarkan kosong jika pilihan form mengizinkan) dan set **Build output directory** ke `.` jika `index.html` berada langsung di root repository.
5. Deploy. Pastikan `index.html` berada di root direktori output.

Dokumentasi resmi: https://developers.cloudflare.com/pages/framework-guides/deploy-anything/

## Catatan

- Opening sinematik: pusaran partikel mengerucut ke ornamen yang tergambar sendiri, judul muncul huruf demi huruf, lalu layar terbuka seperti iris dan slide pertama masuk.
- Setiap slide punya dunia visual sendiri (rosette, konstelasi, mihrab, fajar, kompas, irisan tiga lingkaran, orbit, masjid, tunas, jangkar, tumpukan buku, bulan sabit) yang terus bergerak selama slide tampil, berikut warna latar dan suasana partikel yang berbeda.
- Judul berkilau emas secara berkala, kartu miring 3D mengikuti kursor (desktop), dan ada sorotan cahaya yang mengikuti kursor. Sapuan cahaya dan reveal kata demi kata menyertai tiap perpindahan slide.
- Tidak ada foto atau library eksternal. Satu-satunya sumber dari internet adalah Google Fonts (Manrope, Playfair Display, DM Mono); bila offline, font cadangan dipakai.
- Tombol switch di kanan bawah (atau pengaturan "kurangi gerakan" di perangkat) mematikan efek gerak. Pada HP jumlah partikel otomatis dikurangi.
- Layout sudah disesuaikan untuk HP (portrait dan landscape), tablet, laptop, dan layar lebar. Pada layar yang sangat kecil, slide dengan teks panjang bisa digulir.
- Referensi akademik dipertahankan sesuai tulisan yang tertera pada PPT asli dan belum diverifikasi satu per satu.
