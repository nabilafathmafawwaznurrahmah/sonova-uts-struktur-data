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
