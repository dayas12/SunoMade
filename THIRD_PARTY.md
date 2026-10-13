# FFmpeg WebAssembly

- Paket: `@ffmpeg/core` **0.12.10**, single-thread.
- Runtime: FFmpeg **5.1.4**, dengan codec/filter sesuai build upstream.
- Lisensi binary core: **GPL-2.0-or-later**, sesuai metadata upstream. Teks lisensi ada di `public/vendor/ffmpeg/COPYING`.
- FFmpeg dan seluruh pustaka codec mempertahankan hak cipta upstream. Wrapper/build ffmpeg.wasm: Jerome Wu dan kontributor; lisensi wrapper upstream ada di `LICENSE-wrapper`.
- Binary Wasm dan glue JavaScript tidak dimodifikasi. Metadata `package.json` lokal hanya ditambah `type: module` untuk test ESM di Node.
- Arsip npm upstream disertakan sebagai `package-source.tgz`; ini adalah distribusi paket asli (termasuk binary), bukan seluruh source C FFmpeg.
- Integritas paket npm SHA-512 diverifikasi sebelum pemakaian. SHA-256 binary dan metadata paket tersimpan di `PROVENANCE.json`.

Sumber FFmpeg 5.1.4: [FFmpeg n5.1.4](https://github.com/FFmpeg/FFmpeg/tree/n5.1.4). Source wrapper, build scripts, Dockerfile, dan referensi source codec upstream: [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm). [Paket core 0.12.10](https://www.npmjs.com/package/@ffmpeg/core/v/0.12.10) memuat provenance distribusi yang dipakai.

Pertahankan pemberitahuan/lisensi dan penuhi ketentuan distribusi source GPL dari FFmpeg serta dependensinya ketika mendistribusikan ulang binary atau versi modifikasi. Seluruh kode aplikasi yang dibuat untuk paket ini tersedia sebagai source JavaScript yang dapat dibaca. Tidak ada SoundTouchJS atau encoder lamejs terpisah pada jalur audio aplikasi ini; MP3 memakai LAME yang dibundel di FFmpeg.
