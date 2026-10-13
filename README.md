# Human Made Web — versi Vercel tanpa aktivasi

Versi web mandiri yang dibangun dari analisis aplikasi `AI_Music_Audacity_Master.exe` dalam arsip pemilik. Antarmuka Windows diganti dengan antarmuka browser; logika DSP direkonstruksi dalam JavaScript. Ini bukan file EXE yang dijalankan di server dan bukan pemulihan source Python yang identik.

## Deploy ke Vercel

1. Ekstrak ZIP ini. Upload isi folder `suno-human-made-web` ke repository GitHub Anda.
2. Di Vercel pilih **Add New → Project**, lalu impor repository tersebut.
3. Pilih folder yang berisi `vercel.json` sebagai **Root Directory**.
4. Framework: **Other**. Output Directory: **public**. Build Command: kosong. Tidak ada environment variable, database, API key, atau license key.
5. Klik **Deploy**. `vercel.json` sudah memuat konfigurasi situs statis dan header keamanan.

Alternatif dari folder proyek dengan Node.js terpasang:

```sh
npx vercel
```

Ikuti login/pengaitan proyek, lalu gunakan `npx vercel --prod` untuk produksi. Paket ini belum diterbitkan ke akun Vercel Anda.

## Menjalankan lokal

Dengan Node.js 22 atau lebih baru:

```sh
npm run dev
```

Buka `http://127.0.0.1:4173`. Tidak perlu `npm install` karena pustaka audio sudah disertakan. Gunakan HTTP lokal atau HTTPS Vercel; membuka HTML langsung lewat `file://` tidak mendukung pemuatan modul dan worker dengan benar.

## Fitur

- Antrean beberapa lagu, pemrosesan berurutan, progres, penghentian proses, dan unduh per lagu.
- Sembilan preset: lima preset bawaan aplikasi asal dan empat preset dari `custom_presets.json` dalam arsip.
- Simpan/hapus preset kustom di browser, impor/ekspor JSON yang kompatibel dengan parameter asli.
- De-resonance multiband, saturasi analog, transient punch, convolution ruangan studio, dispersi fase, micro flutter, harmonic air, room tone/dither, mono bass, pitch dan tempo terpisah, estimasi loudness dan pembatas peak.
- Preview original dan hasil, ekspor WAV 24/16 bit, MP3 320 kbps, FLAC 24 bit.
- Semua audio diproses di perangkat pengguna melalui Web Worker. Tidak ada unggahan audio ke server, akun, aktivasi, HWID, validasi lisensi, atau panggilan ke layanan aktivasi.
- Metadata input tidak disalin. WAV menyebut `Human Made Web` sebagai software pembuat. Pilihan metadata DAW yang mengesankan hasil dibuat oleh DAW lain tidak dipindahkan.

## Batas dan perbedaan

- **Bukan hasil bit-identik dengan aplikasi desktop.** Filter JavaScript, generator noise, dan SoundTouchJS menggantikan NumPy/SciPy serta FFmpeg/Rubber Band. Konstanta utama dan urutan efek dipetakan dari bytecode asli.
- Mastering loudness/peak ditempatkan setelah pitch dan filter akhir agar keluaran akhir tetap dibatasi. Kode desktop mengerjakannya sebelum langkah FFmpeg terakhir.
- Mono bass `Off` dan pilihan frekuensi bekerja di versi web. Kode desktop yang diperiksa menerima parameter tersebut tetapi selalu menjadikan band di bawah 200 Hz mono.
- LUFS dan dBTP di UI adalah estimasi browser, bukan meter tersertifikasi. Pembatas peak memakai interpolasi kubik empat fase. Target LUFS bisa tidak tercapai karena pembatas gain dan peak.
- FLAC memakai subframe verbatim: tetap lossless, tetapi ukuran mendekati WAV dan tidak memakai tingkat kompresi 8 seperti versi desktop.
- MP3 menyertakan padding encoder biasa dan tidak memiliki metadata gapless Xing/LAME; durasi hasil decode bisa sedikit lebih panjang.
- Input harus bisa didekode oleh browser. Dukungan FLAC, M4A, AAC, AIFF, dan format lain bergantung pada browser. Gunakan WAV/MP3 dan Chrome/Edge terkini untuk kompatibilitas terbaik.
- Input mono digandakan ke stereo; input lebih dari dua kanal ditolak. Pemrosesan memakai 44.1 kHz. Maksimum 128 MB dan 10 menit per file. Lagu panjang tetap bisa melampaui memori browser, terutama di ponsel.
- Preset tersimpan per browser/origin. File hasil tidak tersimpan setelah halaman ditutup; unduh dahulu. Tidak ada pemilihan folder output Windows atau pemindaian folder rekursif.
- Klaim aplikasi asal tentang penghilangan watermark atau skor detektor AI tidak terbukti oleh analisis ini dan tidak dijamin oleh versi web.

## Verifikasi

```sh
npm test
```

Enam pengujian mesin audio memeriksa validasi parameter, FFT/convolution, pitch/tempo, peak dan nilai numerik, encoder, input pendek, serta frame FLAC panjang. File keluaran juga diperiksa menggunakan libsndfile secara independen: WAV, FLAC, dan MP3 berhasil didekode; PCM FLAC sama persis dengan WAV 24 bit.

Uji integrasi DOM lokal juga lulus untuk pemuatan sembilan preset, penyimpanan preset, antrean, worker audio, unduhan ketiga format, dan pembersihan antrean. Uji ini memakai adapter decoder/worker dan tidak menggantikan uji browser asli.

Pemeriksaan tampilan lewat browser lokal tidak selesai karena koneksi loopback lingkungan pengerjaan timeout. Lakukan pemeriksaan tampilan, unggah lagu, simpan preset, penghentian proses, dan unduh hasil setelah deployment pertama. Status ini tidak berarti deployment Vercel sudah diuji.

Lihat `REVERSE_ENGINEERING.md` untuk temuan dan `THIRD_PARTY.md` untuk pustaka serta lisensinya.
