# 🎧 Sonova — Toko Audio Online
**UTS Struktur Data** — toko online khusus perangkat audio personal (headphone,
headset, TWS, earphone). Implementasi
**Array, Pointer, Struct, Sorting (Bubble Sort), dan Searching
(Linear Search)** dalam **C++**, dengan antarmuka website
**HTML / CSS / JavaScript**.

---

## 1. Arsitektur (dan alasan memilihnya)

```
┌──────────────────────────────┐        HTTP (localhost:8080)        ┌──────────────────────────────────────┐
│  BROWSER (frontend)          │  <-------------------------------->  │  SERVER C++ (server.cpp)             │
│  index.html, style.css,      │   GET  /               → HTML       │  • Array   : Product products[100]   │
│  app.js                      │   GET  /api/products   → JSON       │  • Struct  : struct Product          │
│                              │   POST /api/products   → JSON       │  • Pointer : Product* traversal &    │
│  Tugas: menampilkan audio    │   GET  /api/sort       → JSON+log   │            pointer arithmetic        │
│  dan log (fetch → render)    │   GET  /api/search     → JSON+log   │  • Bubble Sort (asc/desc) + log      │
│                              │                                      │  • Linear Search (nama/kategori)+log │
└──────────────────────────────┘                                      └──────────────────────────────────────┘
```

**Mengapa ini arsitektur paling sederhana?**

- Server HTTP ditulis **langsung di C++ dengan Winsock** — Winsock sudah
  **built-in di Windows**, jadi **tidak perlu menginstal** Apache, Nginx,
  Node.js, pustaka JSON, atau toolchain WebAssembly.
- Koneksi C++ ↔ website **benar-benar nyata**: browser memakai `fetch()`
  ke `http://localhost:8080`; **seluruh data hanya ada di server C++**
  (array of struct) dan **seluruh algoritma dieksekusi di C++**.
  JavaScript hanya menampilkan hasil — JS memakai *referensi*, **bukan**
  pointer eksplisit seperti C++.
- Alternatif yang **ditolak** karena tidak sederhana:
  *WebAssembly (Emscripten)* — butuh instalasi toolchain besar;
  *Node.js + addon C++* — butuh Node.js dan node-gyp;
  *CGI di Apache* — butuh web server terpisah.

---

## 2. Struktur file

| File | Isi |
|---|---|
| `server.cpp` | **Inti proyek**: struct `Product`, array `products[100]`, manipulasi pointer, Bubble Sort + log, Linear Search + log, whitelist kategori audio, dan server HTTP Winsock + JSON API |
| `index.html` | Antarmuka website (form tambah, kontrol cari/urut, katalog, panel log, modal keranjang) |
| `style.css` | Tampilan (kartu produk, panel log terminal, tombol/badge/modal keranjang, toast) |
| `app.js` | Frontend: `fetch()` ke API C++, render hasil/log, dan logika keranjang (`localStorage`) |
| `build.bat` | Kompilasi otomatis (MinGW atau MSVC) |
| `test_api.py` | Uji otomatis semua endpoint (pakai Python bawaan Windows) |

### Keranjang belanja (frontend)

Fitur keranjang bersifat **murni frontend** (localStorage) — server C++ tetap
hanya menyimpan katalog, sehingga Array/Pointer/Struct/sorting/searching di C++
tidak berubah. Rincian:

- **Tombol keranjang di navbar** dengan badge jumlah total unit; diklik untuk
  membuka modal keranjang.
- **"Tambah ke Keranjang"** di tiap kartu produk. Produk sama menambah *jumlah*
  (bukan baris duplikat); jumlah tidak boleh melebihi stok (tombol `+`
  men disabled & ada notifikasi bila stok tidak mencukupi).
- **Isi keranjang**: foto, nama, harga satuan, jumlah, subtotal, stok; kendali
  tambah/kurangi jumlah (min. 1) dan hapus; subtotal & total dihitung otomatis
  memakai harga katalog terkini, seluruhnya dalam format **Rupiah**.
- **Penyimpanan**: `localStorage` (`sonova_cart`) — isi keranjang bertahan
  saat halaman di-refresh. Tidak ada data pembayaran yang disimpan/diminta.
- **Integrasi katalog**: keranjang hanya menyimpan `{ id, qty }`; nama, harga,
  stok, dan foto diambil dari katalog server saat dirender. Bila produk dihapus
  atau stoknya berubah, item dikeluarkan / jumlahnya dikunci ke stok terbaru.
- **Tidak ada tombol checkout** — halaman ini hanya katalog, tanpa pembayaran.

**Catatan foto produk:** foto pada katalog diambil dari **Wikimedia Commons**
(lisensi bebas, dapat di-hotlink), dipilih bergaya studio (produk di tengah,
latar bersih, tanpa watermark), dan disesuaikan dengan nama/model produk.
Foto dapat berbeda dari foto resmi produsen. Pemetaan foto per produk ada di
`PRODUCT_IMAGES` (`app.js`); produk tanpa pemetaan (atau foto gagal dimuat)
memakai gambar fallback berupa area putih dengan ikon audio sederhana.

---

## 3. Cara menjalankan di Windows (VS Code)

### Prasyarat (satu kali)
Instal kompiler C++ MinGW-w64 (sudah built-in di Windows tapi perlu g++):

```powershell
winget install BrechtSanders.WinLibs.POSIX.UCRT
```
Lalu **tutup & buka ulang VS Code / terminal** agar PATH diperbarui.
(Alternatif: instal "Visual Studio Build Tools" dengan workload C++.)

### Kompilasi & jalankan
1. Buka folder proyek di VS Code, buka **Terminal → New Terminal**.
2. Kompilasi:
   ```powershell
   .\build.bat
   ```
   atau manual:
   ```powershell
   g++ -std=c++17 -O0 -static-libgcc -static-libstdc++ server.cpp -o server.exe -lws2_32
   # MSVC: cl /EHsc /O2 server.cpp
   ```
3. Jalankan server:
   ```powershell
   .\server.exe
   ```
   Terminal menampilkan: `Server C++ ... berjalan di: http://localhost:8080`
4. Buka browser: **http://localhost:8080**

> `server.exe` membaca `index.html`, `style.css`, `app.js` dari folder tempat
> ia dijalankan — pastikan terminal berada di folder proyek.

---

## 4. Cara menguji Array, Pointer, Struct, Sorting, Searching

| Ketentuan | Tempat membuktinya |
|---|---|
| **Struct** | `struct Product` di `server.cpp`; setiap produk = 1 struct (id, name, category, price, stock). |
| **Array** | `Product products[MAX_PRODUCTS]` — array statis; klik **Tampilkan Semua** untuk melihat seluruh isi array. |
| **Pointer** | `Product* p = &products[i]` saat menambah; `for (Product* p = products; p < products + n; p++)` saat sort/search; `*a = *b` saat swap. Log menampilkan indeks & alur pointer. |
| **Sorting** | Klik **Urutkan Harga ↑ / ↓** → panel **Log Proses** menampilkan tiap pass, tiap perbandingan (`Bandingkan [0] 'Headphone Sony ...' ... dengan [1] ...`), dan tiap **TUKAR**; plus ringkasan jumlah pass/perbandingan/swap. |
| **Searching** | Ketik kata kunci (mis. `sony`, `tws`, `headphone`) → klik **Cari** → log menampilkan tiap pemeriksaan elemen (`Periksa produk[0] ... -> tidak cocok / COCOK`) dan ringkasan pemeriksaan vs. ditemukan. |
| **Kategori** | Formulir hanya menerima 4 kategori (Headphone, Headset, TWS, Earphone) — divalidasi di `app.js` **dan** di server C++ (`isAudioCategory`); kategori lain (termasuk Speaker/Mikrofon) ditolak HTTP 400. |

Uji otomatis (server harus berjalan):

```powershell
python test_api.py
```

Harus mencetak `SEMUA UJI LULUS ✔` (menguji katalog, tambah produk,
sort asc/desc + verifikasi urutan, search nama & kategori, halaman HTML).

> Proyek ini sudah diuji dengan g++ 4.9.2 (Dev-Cpp, mode C++11) dan
> g++ 16.2.0 (WinLibs, mode C++17) — keduanya mengompilasi `server.cpp`
> tanpa error/warning.

---

## 5. Upload ke GitHub

```powershell
git init
git add .
git commit -m "UTS Struktur Data: Sonova E-Commerce (C++ Array Pointer Struct + Sorting Searching)"
git branch -M main
git remote add origin https://github.com/<username>/sonova-uts.git
git push -u origin main
```
(`.gitignore` sudah mengecualikan `server.exe`.)

---

## 6. Panduan demo video (3–5 menit)

Rekam layar dengan **Xbox Game Bar** (`Win + G`) atau **OBS Studio**.
Naskah per menit:

| Waktu | Adegan | Narasi singkat |
|---|---|---|
| 0:00–0:40 | Tampilkan `server.cpp` (struct Product, array, fungsi pointer) | "Inti program C++: struct Product, array products[100], semua manipulasi pakai pointer." |
| 0:40–1:20 | Kompilasi via `.\build.bat`, jalankan `.\server.exe`, buka localhost:8080 | "Server HTTP ditulis di C++ pakai Winsock — tanpa instalasi tambahan. Katalog hanya 4 kategori perangkat audio personal." |
| 1:20–2:10 | Klik **Urutkan Harga ↑**, tunjuk kartu berubah & **log tiap pass & TUKAR**; ulangi ↓ | "Bubble Sort ascending/descending, log menampilkan setiap perbandingan dan swap." |
| 2:10–3:00 | Cari **'sony'** berdasar nama → 1 hasil (Headphone Sony); cari **'Headphone'** berdasar kategori | "Linear Search: tiap elemen diperiksa satu per satu, log menampilkan cocok/tidak." |
| 3:00–3:40 | Tambah produk baru lewat form (mis. "Headphone Sennheiser HD 599", kategori Headphone), muncul di katalog & log TAMBAH; coba masukkan kategori "Speaker" → ditolak | "Produk baru disimpan ke slot kosong array lewat pointer; kategori di luar whitelist ditolak." |
| 3:40–4:20 | Klik **Tambah ke Keranjang** pada 2 produk (badge navbar naik), buka keranjang, ubah jumlah, hapus; muat ulang halaman → isi keranjang tetap ada | "Keranjang disimpan di localStorage, jadi tetap ada setelah refresh. Nama, harga, dan stok tetap diambil dari katalog, bukan disimpan ganda." |
| 4:20–5:00 | Jalankan `python test_api.py` → SEMUA UJI LULUS | "Uji otomatis membuktikan urutan sorting & hasil searching benar." |
| 5:00–5:30 | Tampilkan repo GitHub | "Source code lengkap di GitHub." |

Tips: perbesar font terminal & browser, sebutkan angka pada log
(jumlah perbandingan/swap) agar terlihat jelas proses algoritmanya.

---

## 7. Troubleshooting

- **"Gagal bind ke port 8080"** → port dipakai proses lain; tutup tab/instance
  server.exe sebelumnya (Task Manager) atau ganti port di `server.cpp` (`htons(8080)`).
- **Halaman kosong / "index.html tidak ditemukan"** → jalankan `server.exe`
  dari folder proyek (tempat `index.html` berada).
- **Windows Defender memblokir `server.exe`** (false positive
  `Behavior:Win32/DefenseEvasion.A!ml`, umum pada program Winsock
  baru dikompilasi): klik **"Run anyway"** pada notifikasi, atau
  tambah folder proyek ke exclusion:
  *Windows Security → Virus & threat protection → Manage settings →
  Exclusions → Add → folder proyek*.
  Alternatif: kompilasi dengan **Dev-Cpp** (MinGW TDM, bebas
  false positive di banyak mesin):
  `& "C:\Program Files (x86)\Dev-Cpp\MinGW64\bin\g++.exe" -std=c++11 -O0 server.cpp -o server.exe -lws2_32`
- **Karakter aneh di log** → log dirancang memakai ASCII; jika tetap aneh,
  jalankan `chcp 65001` sebelum `.\server.exe`.
