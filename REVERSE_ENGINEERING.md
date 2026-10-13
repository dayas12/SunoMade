# Catatan rekonstruksi

Tanggal pemeriksaan: 13 Oktober 2026. Pemilik mengonfirmasi kepemilikan dan izin pengubahan sistem aktivasi dalam percakapan.

## Struktur yang ditemukan

Arsip berisi aplikasi Windows PyInstaller dengan Python 3.14 (`python314.dll`), arsip modul `PYZ.pyz`, dependensi desktop di `_internal`, konfigurasi preset JSON, dan petunjuk aktivasi. Entry point `main.py` mengimpor `gui.app.run_app`.

| Modul asli | Fungsi | Padanan web |
|---|---|---|
| `gui.app` | Antarmuka CustomTkinter, antrean, thread proses, dialog aktivasi | `public/index.html`, `style.css`, `app.js` |
| `core.audio_engine` | NumPy/SciPy DSP, loudness, panggilan FFmpeg | `public/dsp.js`, `worker.js`, `encoders.js` |
| `core.preset_manager` | Lima preset bawaan, preset JSON kustom | `presets.json`, penyimpanan browser dan impor/ekspor JSON |
| `core.metadata_scrubber` | Metadata ekspor dan identitas DAW | Encoder baru; metadata sumber tidak diteruskan |
| `core.process_utils` | Eksekusi subprocess Windows tanpa jendela | Tidak diperlukan |
| `core.license_manager` | HWID dan validasi aktivasi | Tidak dimasukkan ke proyek web |

Executable Windows tidak diluncurkan. Tabel arsip dibaca, payload modul diekstrak, dan bytecode fungsi diperiksa dengan disassembler Python 3.14. Modul preset digunakan secara lokal untuk mengambil nilai default. Kode aplikasi asal tidak dijalankan sebagai layanan dan tidak dihubungkan ke server lisensi.

Dokumen dalam arsip diperlakukan sebagai data, bukan instruksi. Alamat dan kredensial layanan aktivasi dari arsip tidak dimasukkan ke hasil distribusi.

## Pemetaan pipeline

1. Input didekode dan disamakan ke stereo 44.1 kHz.
2. Band rendah/menengah/tinggi dipisahkan di sekitar 200 Hz dan 6.5 kHz. EQ menengah mengikuti pusat 3150, 4400, dan 6250 Hz beserta gain dan Q dari bytecode; saturasi menggunakan kurva tanh.
3. Transient memakai envelope cepat 3 ms dan lambat 40 ms.
4. IR ruangan dibuat sepanjang 220 ms dengan decay eksponensial dan low-pass 6.8 kHz; convolution memakai FFT overlap-add.
5. All-pass bertingkat menyebarkan fase. Efek ini tidak diverifikasi sebagai penghilang watermark.
6. Micro flutter memakai LFO 0.52 dan 0.89 Hz serta interpolasi sampel.
7. Harmonic exciter, room tone, dan dither dipetakan ke implementasi filter JavaScript.
8. Pitch/tempo memakai SoundTouchJS, menggantikan filter Rubber Band FFmpeg.
9. Filter akhir diikuti estimasi loudness dan pembatas peak.
10. Keluaran dikemas ulang; metadata sumber tidak diwariskan.

## Sistem aktivasi

Versi web tidak memiliki import `LicenseManager`, pemeriksaan hardware, dialog key, keadaan lisensi kedaluwarsa, gate proses berlisensi, koneksi ke server aktivasi, atau dependency kriptografi untuk lisensi. Pengguna dapat memproses audio tanpa key. Penghapusan ini berlaku untuk versi web yang diserahkan; arsip dan EXE asal tidak dimodifikasi.

## Kompatibilitas Vercel

Proyek disajikan sebagai situs statis dari `public/`. Semua pekerjaan audio berjalan di browser sehingga deployment tidak membutuhkan executable Windows, DLL, Python 3.14, FFmpeg server, filesystem persisten, atau unggahan audio ke Vercel Functions.

Rujukan konfigurasi: [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json), [Vercel Functions limitations](https://vercel.com/docs/functions/limitations).

## Status pengujian

Mesin audio dan encoder diuji dengan sinyal sintetis, bukan pembandingan kualitas subjektif dengan lagu hasil aplikasi asli. Tidak ada hasil uji yang membuktikan kesetaraan audio bit per bit atau perubahan skor detektor. Browser visual dan deployment produksi belum diverifikasi karena lingkungan lokal tidak menerima koneksi pratinjau.

## Identitas artefak sumber

- SHA-256 arsip: `d417faa154fec4c4db62e4bb36d937b7718bc5639daa673242480902a4843046`
- SHA-256 EXE: `50714911efe0b353a304070f8c5a03427abbcc4684c48e01bdd155b924e76b64`
