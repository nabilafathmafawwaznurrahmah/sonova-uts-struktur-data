/* ==========================================================================
   Sonova — Frontend JavaScript
   ----------------------------------------------------------------------------
   PENTING: JavaScript TIDAK memiliki pointer eksplisit seperti C++.
   Variabel JS menyimpan referensi ke objek. Implementasi inti struktur data
   (Array, Pointer, Struct), Bubble Sort, dan Linear Search dijalankan
   SEPENUHNYA oleh server C++ (server.cpp). File ini hanya:
     1. mengirim permintaan HTTP (fetch) ke server C++
     2. menampilkan hasil (daftar produk + foto) dan log langkah algoritma
   ========================================================================== */

/* --------------------------------------------------------------------------
   Pemetaan foto produk (sumber: Wikimedia Commons, lisensi bebas).
   Foto dipilih bergaya studio: produk di tengah, latar bersih, pencahayaan
   merata, tanpa watermark. Kunci = nama produk persis seperti yang
   dikembalikan server C++. Produk tanpa pemetaan (mis. produk baru hasil
   input) otomatis memakai gambar fallback yang rapi.
   -------------------------------------------------------------------------- */
const PRODUCT_IMAGES = {
  "Headphone Sony WH-1000XM3":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/df/Sony-WH-1000XM3-kabellose-Bluetooth-Noise-Cancelling-Kopfhoerer.3.jpg/500px-Sony-WH-1000XM3-kabellose-Bluetooth-Noise-Cancelling-Kopfhoerer.3.jpg",
  "Headset Gaming ELECOM HS-ARMA100WH":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9d/ELECOM---HS-ARMA100WH_01.jpg/500px-ELECOM---HS-ARMA100WH_01.jpg",
  "TWS Apple AirPods Pro":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4c/AirPods_Pro_case.jpg/500px-AirPods_Pro_case.jpg",
  "TWS Apple AirPods Pro 2":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/AirPods_Pro_%282nd_generation%29.jpg/500px-AirPods_Pro_%282nd_generation%29.jpg",
  "Headphone Audio-Technica ATH-M50":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/00/Audio_Technica_ATH-M50_Headphones.jpg/500px-Audio_Technica_ATH-M50_Headphones.jpg",
  "TWS Samsung Galaxy Buds2 Pro":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/65/Samsung_Galaxy_Buds2_Pro_%28Graphite%29.jpg/500px-Samsung_Galaxy_Buds2_Pro_%28Graphite%29.jpg",
  "Headphone Bose QuietComfort 25":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/86/Bose_QuietComfort_25_Acoustic_Noise_Cancelling_Headphones.jpg/500px-Bose_QuietComfort_25_Acoustic_Noise_Cancelling_Headphones.jpg",
  "Earphone Apple EarPods":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f2/Apple_EarPods_%284930%29.jpg/500px-Apple_EarPods_%284930%29.jpg",
  "Earphone Xiaomi Hybrid Dual Driver":
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/90/Xiaomi_Hybrid_Dual_Drivers_Earphones.jpg/500px-Xiaomi_Hybrid_Dual_Drivers_Earphones.jpg",
};

/* Gambar fallback: area putih bersih + ikon audio sederhana (SVG),
   dipakai bila foto produk gagal dimuat */
const FALLBACK_IMG =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">' +
      '<rect width="400" height="400" fill="#ffffff"/>' +
      '<g fill="none" stroke="#9ca3af" stroke-width="14" stroke-linecap="round">' +
        '<path d="M110 225 v-25 a90 90 0 0 1 180 0 v25"/>' +
        '<rect x="92" y="222" width="46" height="80" rx="16"/>' +
        '<rect x="262" y="222" width="46" height="80" rx="16"/>' +
      "</g>" +
      '<text x="200" y="345" font-size="20" fill="#9ca3af" text-anchor="middle" font-family="sans-serif">Sonova</text>' +
    "</svg>"
  );

/* Toko khusus perangkat audio personal - 4 kategori (sama dengan server C++) */
const KATEGORI_AUDIO = ["Headphone", "Headset", "TWS", "Earphone"];

const API = {
  products: "/api/products",
  add: "/api/products",
  sort: (order) => `/api/sort?order=${order}`,
  search: (q, by) => `/api/search?q=${encodeURIComponent(q)}&by=${by}`,
};

const el = {
  grid: document.getElementById("product-grid"),
  count: document.getElementById("count-badge"),
  logLines: document.getElementById("log-lines"),
  logOp: document.getElementById("log-op"),
  logSummary: document.getElementById("log-summary"),
  form: document.getElementById("form-tambah"),
  search: document.getElementById("in-search"),
  by: document.getElementById("in-by"),
};

const formatRupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function apiGet(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || "Kesalahan server");
  return data;
}

/* -------------------------- Render daftar produk -------------------------- */
function renderProducts(products) {
  el.count.textContent = `${products.length} produk`;
  el.grid.innerHTML = "";

  if (products.length === 0) {
    el.grid.innerHTML = '<div class="empty">Produk tidak ditemukan.</div>';
    return;
  }

  for (const p of products) {
    const card = document.createElement("article");
    card.className = "card";

    // Foto produk: URL terpetakan, atau fallback rapi jika gagal dimuat
    const imgWrap = document.createElement("div");
    imgWrap.className = "card-img-wrap";
    const img = document.createElement("img");
    img.className = "card-img";
    img.alt = p.name;
    img.loading = "lazy";
    img.src = PRODUCT_IMAGES[p.name] || FALLBACK_IMG;
    img.onerror = () => {
      // Fallback: kalau foto dari URL gagal, pakai gambar fallback
      if (img.src !== FALLBACK_IMG) img.src = FALLBACK_IMG;
    };
    imgWrap.appendChild(img);

    const body = document.createElement("div");
    body.className = "card-body";
    body.innerHTML = `
      <div class="card-top">
        <span class="cat">${escapeHtml(p.category)}</span>
        <span class="stock ${p.stock === 0 ? "habis" : ""}">${p.stock === 0 ? "Habis" : "Stok " + p.stock}</span>
      </div>
      <h3>${escapeHtml(p.name)}</h3>
      <div class="price">${formatRupiah(p.price)}</div>
      <button class="btn-add-cart" data-id="${p.id}" ${p.stock === 0 ? "disabled" : ""}>
        ${p.stock === 0 ? "Stok Habis" : "Tambah ke Keranjang"}
      </button>
      <div class="id">ID #${p.id}</div>`;

    card.appendChild(imgWrap);
    card.appendChild(body);
    el.grid.appendChild(card);
  }
}

/* -------------------------- Render log langkah dari C++ -------------------------- */
function renderLog(operation, data) {
  el.logOp.textContent = operation;
  el.logOp.className = "op-badge " + operation.toLowerCase();
  el.logSummary.textContent = data.summary || "";
  el.logLines.innerHTML = "";

  const lines = data.log || [];
  if (lines.length === 0) {
    el.logLines.innerHTML = "<code>(tidak ada langkah log)</code>";
    return;
  }

  lines.forEach((line, i) => {
    const div = document.createElement("div");
    div.className = "log-line";
    if (line.includes("TUKAR")) div.classList.add("swap");
    else if (line.includes("COCOK")) div.classList.add("match");
    else if (line.includes("MULAI") || line.includes("SELESAI") || line.includes("TAMBAH"))
      div.classList.add("phase");
    div.style.animationDelay = `${Math.min(i * 40, 3000)}ms`;
    div.textContent = line;
    el.logLines.appendChild(div);
  });

  el.logLines.scrollTop = el.logLines.scrollHeight;
}

/* ------------------------------- Muat katalog ------------------------------- */
/* Salinan katalog LENGKAP dari server C++. Menjadi satu-satunya sumber
   nama/harga/stok/foto untuk keranjang — tidak ada data duplikat. */
let catalogCache = [];

function catalogById(id) {
  return catalogCache.find((p) => p.id === id) || null;
}

/* Token urutan rendering. Setiap permintaan tampilan (muat katalog / pencarian)
   mengambil token terbaru; bila setelah await token sudah berubah, berarti ada
   permintaan LEBIH BARU -> hasil lama dibuang dan tidak menimpa hasil terbaru. */
let renderSeq = 0;

/* token boleh dilewatkan oleh pemanggil (mis. live search) agar hasil katalog
   yang diambilnya ikut terhitung dalam antrean yang sama. */
async function loadProducts(token = ++renderSeq) {
  const data = await apiGet(API.products);
  if (token !== renderSeq) return false; // sudah ada permintaan lebih baru -> buang
  catalogCache = data.products;          // cache lengkap (bukan hasil search/sort)
  reconcileCart();                       // bersihkan keranjang sesuai katalog terkini
  renderProducts(data.products);
  return true;
}

/* ==========================================================================
   KERANJANG BELANJA
   --------------------------------------------------------------------------
   - Disimpan di localStorage (localStorage["sonova_cart"]).
   - Item = { id, qty } saja. Nama, harga, stok, dan foto SELALU diambil dari
     katalog server (catalogCache) sehingga tidak ada data harga duplikat.
   - Jumlah (qty) otomatis dibatasi stok tersedia; qty minimal 1.
   ========================================================================== */
const CART_KEY = "sonova_cart";
const cartOverlay = document.getElementById("cart-overlay");

/* ------------------------------- Toast ------------------------------- */
function toast(message, ok = true) {
  const box = document.getElementById("toast-box");
  const t = document.createElement("div");
  t.className = "toast" + (ok ? "" : " warn");
  t.textContent = message;
  box.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

/* --------------------------- Baca / simpan --------------------------- */
function getCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(raw)
      ? raw.filter((i) => i && Number.isInteger(i.id) && Number.isInteger(i.qty) && i.qty > 0)
      : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

/* Sesuaikan keranjang dengan katalog terkini:
   - buang item yang sudah tidak ada di katalog
   - kurangi qty bila melebihi stok terbaru */
function reconcileCart() {
  const cart = getCart();
  let changed = false;
  const next = [];
  for (const item of cart) {
    const p = catalogById(item.id);
    if (!p) { changed = true; continue; }                 // produk sudah tidak dijual
    const qty = Math.min(item.qty, Math.max(p.stock, 0)); // ikuti stok terbaru
    if (qty < 1) { changed = true; continue; }            // stok habis -> keluarkan
    if (qty !== item.qty) changed = true;
    next.push({ id: item.id, qty });
  }
  if (changed) saveCart(next);
  else updateCartBadge();
}

/* --------------------------- Badge jumlah unit --------------------------- */
function updateCartBadge() {
  const badge = document.getElementById("cart-count");
  const total = getCart().reduce((sum, i) => sum + i.qty, 0);
  badge.textContent = String(total);
  badge.classList.toggle("hidden", total === 0);
}

/* ------------------------- Tambah ke keranjang -------------------------
   Produk sama -> jumlah naik 1 (bukan baris duplikat).
   Jumlah baru tidak boleh melebihi stok. */
function addToCart(id) {
  const p = catalogById(id);
  if (!p) { toast("Produk tidak ditemukan di katalog.", false); return; }
  if (p.stock < 1) { toast(`Stok ${p.name} habis.`, false); return; }

  const cart = getCart();
  const item = cart.find((i) => i.id === id);
  const current = item ? item.qty : 0;
  if (current + 1 > p.stock) {
    toast(`Stok ${p.name} tidak mencukupi (tersisa ${p.stock}).`, false);
    return;
  }
  if (item) item.qty += 1;
  else cart.push({ id, qty: 1 });
  saveCart(cart);
  toast(`${p.name} masuk keranjang.`);
  renderCart();
}

/* ------------------------- Ubah jumlah / hapus ------------------------- */
function changeQty(id, delta) {
  const p = catalogById(id);
  const cart = getCart();
  const item = cart.find((i) => i.id === id);
  if (!item) return;

  const next = item.qty + delta;
  if (next < 1) { toast("Jumlah minimal 1. Gunakan tombol Hapus untuk mengeluarkan produk.", false); return; }
  if (p && next > p.stock) { toast(`Stok ${p.name} tidak mencukupi (tersisa ${p.stock}).`, false); return; }

  item.qty = next;
  saveCart(cart);
  renderCart();
}

function removeFromCart(id) {
  const p = catalogById(id);
  saveCart(getCart().filter((i) => i.id !== id));
  toast(`${p ? p.name : "Produk"} dihapus dari keranjang.`);
  renderCart();
}

/* --------------------------- Isi modal keranjang --------------------------- */
function renderCart() {
  const box = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total-value");
  const cart = getCart();

  if (cart.length === 0) {
    box.innerHTML =
      '<div class="cart-empty">Keranjang masih kosong.<br>Pilih produk dari katalog untuk mulai belanja.</div>';
    totalEl.textContent = formatRupiah(0);
    return;
  }

  let total = 0;
  box.innerHTML = cart
    .map((item) => {
      const p = catalogById(item.id);
      if (!p) return "";                         // tidak ada di katalog: sembunyikan
      const subtotal = p.price * item.qty;
      total += subtotal;
      return `
        <div class="cart-row">
          <img class="cart-thumb" src="${PRODUCT_IMAGES[p.name] || FALLBACK_IMG}"
               alt="${escapeHtml(p.name)}" loading="lazy">
          <div class="cart-info">
            <div class="cart-item-name">${escapeHtml(p.name)}</div>
            <div class="cart-item-price">${formatRupiah(p.price)} / unit</div>
            <div class="cart-item-stock ${p.stock === 0 ? "habis" : ""}">Stok tersedia: ${p.stock}</div>
          </div>
          <div class="cart-item-controls">
            <div class="qty-box">
              <button data-act="dec" data-id="${p.id}" aria-label="Kurangi jumlah">−</button>
              <span>${item.qty}</span>
              <button data-act="inc" data-id="${p.id}" aria-label="Tambah jumlah"
                      ${item.qty >= p.stock ? "disabled" : ""}>+</button>
            </div>
            <div class="cart-subtotal">${formatRupiah(subtotal)}</div>
            <button class="cart-remove" data-act="rm" data-id="${p.id}">Hapus</button>
          </div>
        </div>`;
    })
    .join("");

  totalEl.textContent = formatRupiah(total);
}

/* --------------------------- Buka / tutup modal --------------------------- */
function openCart() {
  renderCart();
  cartOverlay.hidden = false;
  document.body.style.overflow = "hidden";
}
function closeCart() {
  cartOverlay.hidden = true;
  document.body.style.overflow = "";
}
document.getElementById("btn-cart").addEventListener("click", openCart);
document.getElementById("cart-close").addEventListener("click", closeCart);
cartOverlay.addEventListener("click", (e) => {
  if (e.target === cartOverlay) closeCart();     // klik area gelap
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !cartOverlay.hidden) closeCart();
});

/* Klik tombol di dalam isi keranjang (delegasi satu listener) */
document.getElementById("cart-items").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.dataset.act === "inc") changeQty(id, +1);
  else if (btn.dataset.act === "dec") changeQty(id, -1);
  else if (btn.dataset.act === "rm") removeFromCart(id);
});

/* Klik "Tambah ke Keranjang" pada kartu produk (delegasi) */
el.grid.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-add-cart");
  if (btn && !btn.disabled) addToCart(Number(btn.dataset.id));
});

/* ------------------------- Tambah produk -> POST ke C++ ------------------------- */
el.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    name: document.getElementById("in-name").value.trim(),
    category: document.getElementById("in-category").value.trim(),
    price: Number(document.getElementById("in-price").value),
    stock: Number(document.getElementById("in-stock").value),
  };

  // Toko khusus audio: kategori non-audio ditolak (server C++ juga menolak)
  const kategoriValid = KATEGORI_AUDIO.some(
    (k) => k.toLowerCase() === payload.category.toLowerCase(),
  );
  if (!kategoriValid) {
    alert("Kategori tidak valid.\nKategori audio yang diterima: " + KATEGORI_AUDIO.join(", "));
    return;
  }

  try {
    const res = await fetch(API.add, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal menambahkan produk");
    catalogCache = data.products;   // server mengirim daftar lengkap -> perbarui cache
    reconcileCart();
    renderProducts(data.products);
    el.form.reset();
    renderLog("TAMBAH", {
      summary: `"${payload.name}" ditambahkan ke katalog Sonova.`,
      log: data.log,
    });
  } catch (err) {
    alert(err.message);
  }
});

/* ==========================================================================
   SEARCHING — tombol Cari, tombol Enter, dan live search (ketik langsung)
   --------------------------------------------------------------------------
   Ketiganya memakai SATU jalur yang sama: GET /api/search (Linear Search C++,
   substring + case-insensitive) beserta log langkah dari server — tidak ada
   implementasi pencarian kedua.
   - Live search memakai debounce singkat supaya tidak request tiap ketikan.
   - Token `renderSeq` memastikan hasil lama TIDAK pernah menimpa hasil terbaru.
   - Kata kunci kosong -> tampilkan seluruh katalog (urutan sorting aktif
     tetap dipertahankan karena /api/products mengembalikan urutan array
     terkini di server).
   ========================================================================== */
const SEARCH_DEBOUNCE_MS = 300;   // debounce singkat untuk live search
let searchTimer = null;           // timer debounce yang masih tertunda

async function runSearch({ live = false } = {}) {
  const token = ++renderSeq;      // klaim urutan render terbaru
  const q = el.search.value.trim();

  /* --- Kata kunci kosong: kembalikan seluruh katalog --- */
  if (!q) {
    let rendered = false;
    try {
      rendered = await loadProducts(token);
    } catch (err) {
      if (token === renderSeq) {
        live ? toast("Gagal memuat katalog: " + err.message, false)
             : alert(err.message);
      }
      return;
    }
    if (!rendered || token !== renderSeq) return;   // sudah tertimpa permintaan baru
    renderLog("RESET", {
      summary: "Kata kunci dikosongkan — menampilkan seluruh katalog (mengikuti urutan sorting yang sedang aktif).",
      log: [],
    });
    return;
  }

  /* --- Ada kata kunci: Linear Search di server C++ + log langkahnya --- */
  try {
    const data = await apiGet(API.search(q, el.by.value));
    if (token !== renderSeq) return;   // hasil basi dibuang, tidak menimpa yang terbaru
    renderProducts(data.products);     // 0 hasil -> "Produk tidak ditemukan." (kosong & rapi)
    renderLog("SEARCHING", data);      // log = pencarian yang benar-benar dijalankan
  } catch (err) {
    if (token !== renderSeq) return;
    live ? toast("Pencarian gagal: " + err.message, false) : alert(err.message);
  }
}

/* Batalkan debounce bila ada aksi eksplisit (Cari/Enter/sorting/reset) */
function cancelSearchDebounce() {
  if (searchTimer) { clearTimeout(searchTimer); searchTimer = null; }
}

/* --- Tombol Cari (perilaku lama dipertahankan, termasuk alert saat kosong) --- */
document.getElementById("btn-search").addEventListener("click", () => {
  if (!el.search.value.trim()) { alert("Masukkan kata kunci pencarian."); return; }
  cancelSearchDebounce();
  runSearch();
});

/* --- Tombol Enter di kolom pencarian: jalankan pencarian saat ini juga.
       Input ini bukan bagian <form>, dan preventDefault() tetap dipasang
       sebagai pengaman agar Enter tidak pernah memuat ulang halaman. --- */
el.search.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  cancelSearchDebounce();             // jangan tunggu debounce: jalankan sekarang
  runSearch();
});

/* --- Live search: perbarui katalog saat pengguna mengetik (debounce) --- */
el.search.addEventListener("input", () => {
  cancelSearchDebounce();
  searchTimer = setTimeout(() => {
    searchTimer = null;
    runSearch({ live: true });
  }, SEARCH_DEBOUNCE_MS);
});

/* --- Ganti bidang pencarian (Nama/Kategori) saat ada kata kunci -> ikut diperbarui --- */
el.by.addEventListener("change", () => {
  if (!el.search.value.trim()) return;
  cancelSearchDebounce();
  runSearch({ live: true });
});

/* ------------------------- Reset -> tampilkan seluruh isi array ------------------------- */
document.getElementById("btn-reset").addEventListener("click", async () => {
  cancelSearchDebounce();             // live search tertunda tidak boleh menimpa reset
  el.search.value = "";
  try {
    await loadProducts();
    renderLog("RESET", {
      summary: "Menampilkan seluruh isi array sebagaimana adanya (tanpa sorting/searching).",
      log: [],
    });
  } catch (err) {
    alert(err.message);
  }
});

/* ------------------------- Sorting -> GET /api/sort ------------------------- */
async function doSort(order) {
  cancelSearchDebounce();             // debounce live search tidak boleh menimpa hasil sorting
  try {
    const data = await apiGet(API.sort(order));
    renderProducts(data.products);
    renderLog("SORTING", data);
  } catch (err) {
    alert(err.message);
  }
}
document.getElementById("btn-sort-asc").addEventListener("click", () => doSort("asc"));
document.getElementById("btn-sort-desc").addEventListener("click", () => doSort("desc"));

/* ------------------------- Navbar: menu hamburger ------------------------- */
const navMenu = document.getElementById("nav-menu");
document.getElementById("btn-menu").addEventListener("click", () => {
  navMenu.classList.toggle("open");
});
navMenu.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => navMenu.classList.remove("open"))
);

/* ==========================================================================
   HERO CAROUSEL
   --------------------------------------------------------------------------
   Tiga slide promosi. Autoplay tiap 5 detik, bisa dikontrol manual (panah +
   titik). Autoplay dijeda saat kursor/fokus pengguna di atas carousel, saat
   tab tersembunyi, dan dimatikan bila pengguna memilih gerak minimal
   (prefers-reduced-motion). CTA memakai pencarian kategori yang sudah ada.
   ========================================================================== */
(function initCarousel() {
  const root = document.getElementById("carousel");
  if (!root) return;                              // elemen tidak ada -> tidak apa-apa

  const track = document.getElementById("carousel-track");
  const slides = Array.from(track.children);
  const dots = Array.from(document.querySelectorAll("#carousel-dots .dot"));
  const prevBtn = document.getElementById("carousel-prev");
  const nextBtn = document.getElementById("carousel-next");

  const AUTOPLAY_MS = 5000;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let index = 0;
  let timer = null;
  let paused = false;                             // jeda karena interaksi pengguna

  function show(i) {
    index = (i + slides.length) % slides.length;  // gulir melingkar
    track.style.transform = `translateX(-${index * 100}%)`;
    slides.forEach((s, k) => s.setAttribute("aria-hidden", k === index ? "false" : "true"));
    dots.forEach((d, k) => {
      d.classList.toggle("active", k === index);
      d.setAttribute("aria-selected", k === index ? "true" : "false");
    });
  }

  function stopAutoplay() {
    if (timer) { clearInterval(timer); timer = null; }
  }
  function startAutoplay() {
    stopAutoplay();
    if (reducedMotion.matches || paused) return;  // hormati gerak minimal / jeda interaksi
    timer = setInterval(() => show(index + 1), AUTOPLAY_MS);
  }
  function restartAutoplay() { startAutoplay(); }  // setelah klik manual: hitung ulang

  /* Kontrol manual */
  prevBtn.addEventListener("click", () => { show(index - 1); restartAutoplay(); });
  nextBtn.addEventListener("click", () => { show(index + 1); restartAutoplay(); });
  dots.forEach((d) =>
    d.addEventListener("click", () => { show(Number(d.dataset.go)); restartAutoplay(); })
  );

  /* Keyboard: panah kiri/kanan bila fokus di area carousel */
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { show(index - 1); restartAutoplay(); }
    else if (e.key === "ArrowRight") { show(index + 1); restartAutoplay(); }
  });

  /* Jeda autoplay saat kursor/fokus pengguna di atas carousel.
     Catatan: klik tombol memberi fokus pada tombol (focusin memicu), tetapi
     karena fokus masih di dalam root, autoplay tetap dijaga. Begitu fokus
     berpindah keluar (focusout dengan relatedTarget di luar root), autoplay
     berjalan kembali — tidak pernah terkunci. */
  root.addEventListener("mouseenter", () => { paused = true; stopAutoplay(); });
  root.addEventListener("mouseleave", () => { paused = false; startAutoplay(); });
  root.addEventListener("focusin", () => { paused = true; stopAutoplay(); });
  root.addEventListener("focusout", (e) => {
    if (!e.relatedTarget || !root.contains(e.relatedTarget)) { paused = false; startAutoplay(); }
  });

  /* Sembunyikan otomatis saat tab tidak terlihat */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAutoplay();
    else startAutoplay();
  });

  /* Perubahan preferensi gerak minimal saat runtime */
  const onMotionChange = () => startAutoplay();
  if (reducedMotion.addEventListener) reducedMotion.addEventListener("change", onMotionChange);

  /* CTA tiap slide: ke katalog sesuai kategori (pakai pencarian by kategori) */
  document.querySelectorAll(".btn-hero[data-cta]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const kategori = btn.dataset.cta;
      const inSearch = document.getElementById("in-search");
      const inBy = document.getElementById("in-by");
      if (inSearch && inBy) {
        inSearch.value = kategori;
        inBy.value = "category";
        document.getElementById("btn-search").click();  // pencarian Linear Search C++
      }
      document.getElementById("produk").scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
      });
    })
  );

  show(0);
  startAutoplay();
})();

/* ------------------------- Awal: muat katalog ------------------------- */
loadProducts().catch((e) =>
  alert("Gagal memuat produk: " + e.message + "\n\nPastikan server C++ (server.exe) sedang berjalan."),
);
