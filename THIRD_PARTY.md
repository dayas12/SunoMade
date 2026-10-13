# Pustaka pihak ketiga

Pustaka disajikan dari folder proyek sendiri; tidak ada CDN saat aplikasi digunakan.

| Pustaka | Versi | Lisensi | Sumber |
|---|---|---|---|
| SoundTouchJS | 0.1.30 | LGPL-2.1 | https://github.com/cutterbl/SoundTouchJS |
| lamejs / LAME | 1.2.1 | LGPL-3.0 (sesuai metadata paket) | https://github.com/zhuker/lamejs dan https://www.mp3dev.org |

Source distribusi upstream lengkap tersedia dalam `public/vendor/source/*.tgz`. Source JavaScript yang dipakai aplikasi ada di `public/vendor/` bersama lisensi masing-masing. SoundTouchJS tidak dimodifikasi. Modifikasi lamejs terbatas pada penambahan `export default lamejs` di akhir file untuk pemuatan sebagai ES module; source modifikasi tersebut ikut didistribusikan secara terbuka di folder vendor dengan lisensi upstream.

Pengguna dan pengembang dapat mengganti pustaka LGPL tersebut dengan versi yang dimodifikasi. Jangan menghilangkan atribusi, lisensi, atau source saat mendistribusikan versi turunan. Tidak ada kode lisensi/aktivasi aplikasi asli dalam pustaka ini.
