# Human Made V1 + bulk download + FFmpeg lokal

Versi ini kembali ke aplikasi terbuka seperti V1: tanpa login, admin, member, Redis, atau aktivasi. Unduhan semua hasil dalam satu ZIP dipertahankan. Decoding, DSP, pitch/tempo, encoding, pengukuran loudness, dan pengemasan ZIP berjalan di browser PC pengguna.

## Deploy ke Vercel

1. Ekstrak ZIP ini dan gunakan folder `suno-human-made-v1-ffmpeg` sebagai proyek baru/isi repository pengganti yang bersih. Jangan menimpa hanya sebagian folder V2 karena folder API lama dapat tertinggal.
2. Impor repository ke Vercel. Root Directory adalah folder yang berisi `vercel.json`.
3. Pilih **Other**, Output Directory **public**, Build Command kosong. Tidak ada environment variable atau database yang diperlukan.
4. Deploy. Pastikan `public/vendor/ffmpeg/ffmpeg-core.wasm` ikut tersimpan dalam repository dan deployment.

Jika memakai proyek Vercel V2 yang sama, hapus sumber API/auth/Redis lama dari repository saat mengganti dengan isi paket ini, dan hapus environment variable admin/Redis yang sudah tidak digunakan. Paket ini tidak memanggilnya.

## Cara memakai

1. Tambahkan satu atau beberapa lagu dan pilih preset.
2. Klik **Mulai mastering**. Pada penggunaan pertama, browser memuat mesin FFmpeg sekitar 31 MB dari situs yang sama, lalu menyiapkannya secara lokal.
3. Unduh per lagu atau klik **Unduh semua ZIP**. ZIP memuat seluruh hasil yang tersedia, tanpa mengompresi ulang audio. Nama duplikat diberi akhiran angka.
4. Unduh hasil sebelum menutup halaman. File audio hasil hanya tersimpan di memori browser selama halaman terbuka.

## Apa yang berjalan di PC

| Bagian | Tempat pemrosesan |
|---|---|
| Baca file input | Browser PC pengguna |
| Decode/downmix/resample | FFmpeg WebAssembly dalam Web Worker lokal |
| Multiband, transient, convolution, phase, flutter, air, dither, mastering | JavaScript DSP dalam worker lokal |
| Pitch/tempo dan high-pass/low-pass akhir | FFmpeg WebAssembly lokal |
| WAV 16/24 bit, MP3 320 kbps, FLAC 24 bit level 8 | FFmpeg WebAssembly lokal |
| Loudness dan true peak hasil ekspor | Filter `ebur128=peak=true` FFmpeg lokal |
| ZIP bulk | Browser PC pengguna |
| Vercel | Menyajikan HTML, JavaScript, preset, dan binary WebAssembly sebagai file statis |

Tidak ada unggahan lagu, endpoint audio, server render, layanan AI, CDN pihak ketiga saat runtime, akun, atau database. Permintaan aplikasi hanya mengambil aset dari situs yang sama. Internet masih diperlukan untuk membuka situs dan mengambil mesin/aset yang belum tersimpan dalam cache; pemrosesan audio tidak dikirim ke internet.

## FFmpeg dan perbedaan terhadap EXE

Paket menyertakan **FFmpeg WebAssembly `@ffmpeg/core` 0.12.10**, menggunakan FFmpeg 5.1.4, single-thread. Ini adalah FFmpeg nyata yang berjalan di browser. Encoding MP3 memakai `libmp3lame`; FLAC memakai encoder FFmpeg dengan `-compression_level 8`.

Versi EXE menjalankan filter `rubberband` untuk pitch/tempo. Build WebAssembly resmi yang disertakan **tidak memuat Rubber Band**, berdasarkan pemeriksaan daftar filter mesin yang benar-benar dijalankan. Versi browser memakai `asetrate → aresample → atempo`, lalu high-pass 28 Hz dan low-pass 19.5 kHz. Pitch dan tempo dapat diatur terpisah; algoritmenya berbeda dari Rubber Band. Wrapper juga mengenali `rubberband` bila kelak memakai core kompatibel yang menyertakannya, tetapi core yang didistribusikan sekarang tidak memilikinya.

DSP mastering tetap merupakan rekonstruksi JavaScript dari logika desktop, bukan source Python/NumPy/SciPy asli. Mastering dikerjakan sebelum filter akhir FFmpeg, mengikuti urutan besar pipeline EXE. Hasil tidak dijamin sama bit per bit dengan EXE, dan tidak ada jaminan skor detektor AI atau penghilangan watermark.

## Batas

- Maksimal 128 MB dan 10 menit per input; maksimal total 2 GB per bulk ZIP.
- Gunakan Chrome/Edge desktop terkini. Kecepatan dan kapasitas tergantung CPU/RAM PC. WebAssembly dapat lebih lambat daripada FFmpeg native Windows.
- Build single-thread tidak membutuhkan SharedArrayBuffer atau header isolasi lintas origin.
- Input didekode oleh FFmpeg, didownmix ke stereo, dan diresample ke 44.1 kHz. Preview original bergantung pada codec yang dapat dimainkan browser; pemrosesan tidak bergantung pada decoder browser.
- Metadata sumber tidak diteruskan; hasil diberi judul berdasarkan nama file dan komentar yang menyebut Human Made Web.
- Target LUFS tidak selalu tercapai karena pembatas gain/peak; UI menampilkan pengukuran FFmpeg atas file hasil yang benar-benar diekspor.
- Penutupan tab atau penghentian proses membuang kerja yang sedang berjalan. Hasil yang sudah selesai tetap tersedia sampai tab ditutup/antrean dibersihkan.

## Lokal dan pengujian

Dengan Node.js 22 atau lebih baru:

```sh
npm run dev
```

Buka `http://127.0.0.1:4173`. Server lokal hanya menyajikan aset, tidak memproses audio. Tidak perlu `npm install`. Jangan membuka HTML melalui `file://` karena modul/worker memerlukan HTTP/HTTPS.

```sh
npm test
```

Delapan pengujian mencakup DSP, filter FFmpeg aktual, perubahan pitch/tempo, empat pilihan ekspor, FLAC lossless, pengukuran loudness, penolakan input rusak, dan ZIP bulk. Pengujian FFmpeg menjalankan binary WebAssembly yang disertakan; tidak mengganti FFmpeg dengan mock. Pengujian worker/DOM lokal juga berhasil memproses dan mengunduh WAV/MP3/FLAC serta ZIP, dengan akses jaringan selain pemuatan aset lokal ditolak dalam adapter pengujian. File ekspor diperiksa lagi menggunakan decoder audio independen.

Pratinjau visual dan deployment Vercel baru belum diverifikasi. Pengujian Node/DOM tidak menggantikan pemeriksaan visual browser. Setelah deploy, periksa pemuatan WASM, dua lagu dalam satu antrean, penghentian proses, serta ZIP hasil pada PC Anda.

Lihat `THIRD_PARTY.md` untuk atribusi dan sumber FFmpeg.
