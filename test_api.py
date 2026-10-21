#!/usr/bin/env python3
# ============================================================================
#  test_api.py - Uji otomatis API server Sonova (C++) - Toko Audio Online
#  Cara pakai:
#    1. Jalankan server.exe (server C++ harus berjalan)
#    2. python test_api.py
# ============================================================================
import json
import sys
import urllib.error
import urllib.request

# Agar karakter ✔/✘ tampil benar di console Windows (cp1252)
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

BASE = "http://localhost:8080"

# Kategori yang diterima (harus sesuai whitelist di server.cpp)
AUDIO_CATEGORIES = {"headphone", "headset", "tws", "earphone"}


def call(method, path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(
        BASE + path, data=data, method=method,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode())


def main():
    # 1) GET katalog - pastikan SEMUA produk adalah produk audio
    d = call("GET", "/api/products")
    assert d["ok"] and d["count"] > 0, "katalog kosong"
    for p in d["products"]:
        assert p["category"].lower() in AUDIO_CATEGORIES, (
            f"produk non-audio ditemukan: {p['name']} ({p['category']})"
        )
    print(f"[OK] GET  /api/products          -> {d['count']} produk, "
          f"semua audio ({', '.join(sorted(AUDIO_CATEGORIES & {p['category'].lower() for p in d['products']}))})")

    # 2) POST tambah produk audio (menguji struct + array + pointer)
    d = call("POST", "/api/products",
             {"name": "Earphone TWS Bass", "category": "Earphone",
              "price": 250000, "stock": 20})
    assert d["ok"], d.get("error")
    assert any(p["name"] == "Earphone TWS Bass" for p in d["products"])
    print(f"[OK] POST /api/products          -> total {d['count']} produk audio")

    # 2b) POST kategori DI LUAR whitelist harus DITOLAK server (HTTP 400)
    for kategori_ditolak in ("Fashion", "Speaker", "Mikrofon"):
        try:
            call("POST", "/api/products",
                 {"name": f"Produk {kategori_ditolak}", "category": kategori_ditolak,
                  "price": 320000, "stock": 40})
            raise AssertionError(f"kategori '{kategori_ditolak}' seharusnya ditolak")
        except urllib.error.HTTPError as e:
            assert e.code == 400, f"status kode salah: {e.code}"
    print("[OK] POST /api/products (Fashion/Speaker/Mikrofon) -> DITOLAK HTTP 400 (whitelist 4 kategori)")

    # 3) Bubble Sort ascending + verifikasi urutan + log
    d = call("GET", "/api/sort?order=asc")
    assert d["ok"] and d["compares"] > 0 and len(d["log"]) > 2
    prices = [p["price"] for p in d["products"]]
    assert prices == sorted(prices), "urut ascending SALAH"
    print(f"[OK] GET  /api/sort?order=asc    -> {d['compares']} perbandingan, "
          f"{d['swaps']} swap, {len(d['log'])} baris log")

    # 4) Bubble Sort descending + verifikasi urutan
    d = call("GET", "/api/sort?order=desc")
    prices = [p["price"] for p in d["products"]]
    assert prices == sorted(prices, reverse=True), "urut descending SALAH"
    print(f"[OK] GET  /api/sort?order=desc   -> {d['compares']} perbandingan, "
          f"{d['swaps']} swap, {len(d['log'])} baris log")

    # 5) Linear Search by nama (produk audio)
    d = call("GET", "/api/search?q=sony&by=name")
    assert d["ok"] and d["checks"] > 0 and d["count"] == 1
    assert "Sony" in d["products"][0]["name"]
    print(f"[OK] GET  /api/search?q=sony&by=name      -> {d['count']} ditemukan "
          f"({d['products'][0]['name']}), {d['checks']} pemeriksaan")

    # 6) Linear Search by kategori
    d = call("GET", "/api/search?q=headphone&by=category")
    assert d["ok"] and d["checks"] > 0 and d["count"] == 3
    assert all(p["category"] == "Headphone" for p in d["products"])
    print(f"[OK] GET  /api/search?q=headphone&by=category -> {d['count']} ditemukan, "
          f"{d['checks']} pemeriksaan")

    # 7) Halaman utama termuat dari server C++
    with urllib.request.urlopen(BASE + "/", timeout=10) as r:
        html = r.read().decode()
        assert "Sonova" in html and "product-grid" in html
        # Tiga judul slide hero carousel + wordmark logo
        assert "Discover Your Sound" in html
        assert "Your Sound, Your Style" in html
        assert "Hear Every Detail" in html
        assert 'class="logo"' in html and "sonova" in html
    print("[OK] GET  /                        -> halaman HTML Sonova (toko audio) termuat")

    # 7b) Elemen keranjang ada di HTML (tombol navbar + modal)
    with urllib.request.urlopen(BASE + "/", timeout=10) as r:
        html = r.read().decode()
        assert "btn-cart" in html, "tombol keranjang navbar tidak ditemukan"
        assert "cart-overlay" in html, "modal keranjang tidak ditemukan"
        assert "cart-items" in html, "kontainer isi keranjang tidak ditemukan"
        assert "cart-badge" in html, "badge jumlah keranjang tidak ditemukan"
    print("[OK] GET  /                        -> elemen keranjang (tombol, badge, modal) ada di HTML")

    # 7c) app.js memuat logika keranjang + localStorage
    with urllib.request.urlopen(BASE + "/app.js", timeout=10) as r:
        js = r.read().decode()
        assert "sonova_cart" in js, "localStorage key keranjang tidak ditemukan"
        assert "localStorage.setItem" in js, "penyimpanan localStorage tidak ditemukan"
        assert "addToCart" in js, "fungsi addToCart tidak ditemukan"
        assert "changeQty" in js, "fungsi changeQty tidak ditemukan"
        assert "removeFromCart" in js, "fungsi removeFromCart tidak ditemukan"
        assert "renderCart" in js, "fungsi renderCart tidak ditemukan"
    print("[OK] GET  /app.js                  -> logika keranjang (localStorage, addToCart, changeQty, remove) ada")

    print("\nSEMUA UJI LULUS ✔")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("UJI GAGAL ✘ :", e)
        sys.exit(1)
