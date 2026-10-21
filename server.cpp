// ============================================================================
//  SONOVA - Toko Audio Online
//  Ujian Tengah Semester (UTS) - Struktur Data
//
//  KETENTUAN WAJIB Dosen, dipenuhi di file ini:
//    - STRUCT   : struct Product (baris ~40)
//    - ARRAY    : Product products[MAX_PRODUCTS] (baris ~50)
//    - POINTER  : traversing & manipulasi array memakai pointer / pointer
//                 arithmetic (addProduct, bubbleSort, linearSearch, arrayToJson)
//    - SORTING  : Bubble Sort (ascending & descending) + log tiap langkah
//    - SEARCHING: Linear (Sequential) Search (by nama / kategori) + log tiap langkah
//
//  File ini sekaligus menjadi SERVER HTTP (Winsock - built-in di Windows, tanpa
//  instalasi library tambahan) yang:
//    - mengirim halaman web (index.html, style.css, app.js)
//    - menyediakan JSON API untuk website (GET / POST)
//
//  Kompilasi:
//    MinGW : g++ -std=c++17 -O2 -Wall server.cpp -o server.exe -lws2_32
//    MSVC  : cl /EHsc /O2 server.cpp
//  Jalankan: server.exe  ->  buka http://localhost:8080
// ============================================================================

#ifdef _MSC_VER
#pragma comment(lib, "ws2_32.lib")   // MSVC: link library Winsock otomatis
#endif

#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>                 // SetConsoleOutputCP (wajib setelah winsock2)

#include <cctype>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

// ----------------------------------------------------------------------------
// (1) STRUCT - tipe data produk
// ----------------------------------------------------------------------------
struct Product {
    int    id;            // identitas produk
    char   name[64];      // nama produk
    char   category[32];  // kategori produk
    double price;         // harga (Rp)
    int    stock;         // stok produk
};

// ----------------------------------------------------------------------------
// (2) ARRAY - penyimpanan produk (array statis dari struct)
// ----------------------------------------------------------------------------
const int MAX_PRODUCTS = 100;
Product products[MAX_PRODUCTS];   // <-- ARRAY of STRUCT
int productCount = 0;           // jumlah produk yang terisi
int nextId = 1;                 // id otomatis (auto-increment)

// ----------------------------------------------------------------------------
// Fungsi bantu umum
// ----------------------------------------------------------------------------
static std::string toLower(const std::string& s) {
    std::string r = s;
    for (char& c : r) c = (char)std::tolower((unsigned char)c);
    return r;
}

static void setStr(char* dst, size_t dstSize, const std::string& src) {
    snprintf(dst, dstSize, "%s", src.c_str());
}

static std::string jsonEscape(const std::string& s) {
    std::string r;
    r.reserve(s.size() + 2);
    for (char c : s) {
        switch (c) {
            case '"':  r += "\\\""; break;
            case '\\': r += "\\\\"; break;
            case '\n': r += "\\n"; break;
            case '\r': r += "\\r"; break;
            case '\t': r += "\\t"; break;
            default:   r += c;      break;
        }
    }
    return r;
}

// ----------------------------------------------------------------------------
// Kategori audio yang diterima (whitelist) - toko khusus produk audio
// ----------------------------------------------------------------------------
static bool isAudioCategory(const std::string& category) {
    static const char* audioCategories[] = {
        "Headphone", "Headset", "TWS", "Earphone"
    };
    std::string c = toLower(category);
    for (const char* valid : audioCategories) {
        if (c == toLower(valid)) return true;
    }
    return false;
}

// ----------------------------------------------------------------------------
// (3) POINTER + STRUCT + ARRAY: menambah produk
//     Menulis ke slot kosong array melalui pointer Product*
// ----------------------------------------------------------------------------
static bool addProduct(const std::string& name, const std::string& category,
                       double price, int stock, std::vector<std::string>& log) {
    if (productCount >= MAX_PRODUCTS) {
        log.push_back("[ERROR] Array penuh! Maksimal " + std::to_string(MAX_PRODUCTS) +
                      " produk. Tidak bisa menambah produk baru.");
        return false;
    }

    Product* p = &products[productCount];   // POINTER ke slot kosong dalam array
    p->id = nextId++;
    setStr(p->name, sizeof(p->name), name);
    setStr(p->category, sizeof(p->category), category);
    p->price = price;
    p->stock = stock;

    std::ostringstream oss;
    oss << "[TAMBAH] Product* p = &products[" << (productCount) << "]  // pointer ke slot kosong";
    log.push_back(oss.str());
    oss.str("");
    oss << "[TAMBAH] p->id=" << p->id << "; strcpy(p->name, \"" << name << "\"); p->price="
        << (long long)price << "; p->stock=" << stock;
    log.push_back(oss.str());
    oss.str("");
    oss << "[TAMBAH] productCount: " << productCount << " -> " << (productCount + 1)
        << ". Struct Product berhasil disimpan di dalam array.";
    log.push_back(oss.str());

    productCount++;
    return true;
}

// ----------------------------------------------------------------------------
// (4) POINTER + ARRAY: Bubble Sort (ascending / descending) dengan log langkah
// ----------------------------------------------------------------------------
struct SortResult {
    std::vector<std::string> log;
    int compares = 0;
    int swaps = 0;
    int passes = 0;
};

static SortResult bubbleSort(bool ascending) {
    SortResult r;
    {
        std::ostringstream oss;
        oss << "[MULAI] BUBBLE SORT "
            << (ascending ? "ASCENDING (terkecil -> terbesar)"
                          : "DESCENDING (terbesar -> terkecil)")
            << " | n = " << productCount << " produk"
            << " | traversing array dengan pointer: Product* p = products .. products+n-1";
        r.log.push_back(oss.str());
    }

    if (productCount < 2) {
        r.log.push_back("[INFO] Jumlah produk < 2, tidak perlu sorting.");
        return r;
    }

    int n = productCount;
    bool swapped = true;
    while (swapped) {
        swapped = false;
        r.passes++;
        int passSwaps = 0;

        // Traversal memakai POINTER: p menunjuk elemen array, p+1 elemen berikutnya
        for (Product* p = products; p < products + n - 1; p++) {
            Product* a = p;        // POINTER ke elemen kiri
            Product* b = p + 1;    // POINTER ARITHMETIC: elemen kanan
            r.compares++;

            std::ostringstream step;
            step << "[Pass " << r.passes << "] Bandingkan [" << (int)(a - products) << "] '"
                 << a->name << "' (Rp " << (long long)a->price << ") dengan ["
                 << (int)(b - products) << "] '" << b->name << "' (Rp " << (long long)b->price << ")";

            bool shouldSwap = ascending ? (a->price > b->price) : (a->price < b->price);
            if (shouldSwap) {
                Product temp = *a;   // DEREFERENCE pointer untuk swap
                *a = *b;
                *b = temp;
                swapped = true;
                passSwaps++;
                r.swaps++;
                step << " -> kondisi terpenuhi, TUKAR posisi";
            } else {
                step << " -> biarkan";
            }
            r.log.push_back(step.str());
        }

        std::ostringstream ps;
        ps << "[Pass " << r.passes << "] selesai, swap pada pass ini: " << passSwaps;
        r.log.push_back(ps.str());
        n--;   // elemen terakhir sudah pasti terurut, tidak perlu dibanding lagi
    }

    std::ostringstream fin;
    fin << "[SELESAI] Bubble Sort " << (ascending ? "ASCENDING" : "DESCENDING")
        << " selesai | pass: " << r.passes << " | perbandingan: " << r.compares
        << " | swap: " << r.swaps;
    r.log.push_back(fin.str());
    return r;
}

// ----------------------------------------------------------------------------
// (5) POINTER + ARRAY: Linear (Sequential) Search dengan log langkah
// ----------------------------------------------------------------------------
struct SearchResult {
    std::vector<std::string> log;
    std::vector<Product*> hits;  // menyimpan POINTER ke elemen yang cocok
    int checks = 0;
};

static SearchResult linearSearch(const std::string& query, bool byName) {
    SearchResult r;
    std::string q = toLower(query);
    {
        std::ostringstream oss;
        oss << "[MULAI] LINEAR (SEQUENTIAL) SEARCH | bidang: " << (byName ? "NAMA" : "KATEGORI")
            << " | query = \"" << query << "\" (case-insensitive, substring)"
            << " | n = " << productCount << " produk"
            << " | traversing array dengan pointer: Product* p = products .. products+n";
        r.log.push_back(oss.str());
    }

    if (productCount == 0) {
        r.log.push_back("[INFO] Array kosong, tidak ada produk yang diperiksa.");
        return r;
    }

    // Traversal memakai POINTER dari elemen pertama sampai terakhir
    for (Product* p = products; p < products + productCount; p++) {
        r.checks++;
        const char* field = byName ? p->name : p->category;
        std::string haystack = toLower(field);
        bool match = haystack.find(q) != std::string::npos;

        std::ostringstream step;
        step << "[" << r.checks << "] Periksa produk[" << (int)(p - products) << "] '" << p->name
             << "' | " << (byName ? "nama" : "kategori") << " = \"" << field << "\"";
        step << (match ? " -> COCOK, simpan pointer ke hasil" : " -> tidak cocok, lanjut");
        r.log.push_back(step.str());

        if (match) r.hits.push_back(p);   // simpan POINTER ke elemen yang cocok
    }

    std::ostringstream fin;
    fin << "[SELESAI] Linear search selesai | pemeriksaan: " << r.checks
        << " | ditemukan: " << r.hits.size() << " produk";
    r.log.push_back(fin.str());
    return r;
}

// ----------------------------------------------------------------------------
// Serialisasi ARRAY of STRUCT -> JSON (traversal memakai pointer)
// ----------------------------------------------------------------------------
static std::string productToJson(const Product& p) {
    std::ostringstream oss;
    oss << "{\"id\":" << p.id
        << ",\"name\":\"" << jsonEscape(p.name) << "\""
        << ",\"category\":\"" << jsonEscape(p.category) << "\",";
    if (p.price == (long long)p.price) oss << "\"price\":" << (long long)p.price;
    else                             oss << "\"price\":" << p.price;
    oss << ",\"stock\":" << p.stock << "}";
    return oss.str();
}

static std::string productsToJson() {
    std::ostringstream oss;
    oss << "[";
    for (Product* p = products; p < products + productCount; p++) {  // POINTER traversal
        if (p != products) oss << ",";
        oss << productToJson(*p);   // DEREFERENCE pointer
    }
    oss << "]";
    return oss.str();
}

static std::string logToJson(const std::vector<std::string>& log) {
    std::ostringstream oss;
    oss << "[";
    for (size_t i = 0; i < log.size(); i++) {
        if (i) oss << ",";
        oss << "\"" << jsonEscape(log[i]) << "\"";
    }
    oss << "]";
    return oss.str();
}

// ----------------------------------------------------------------------------
// Server HTTP minimal (Winsock)
// ----------------------------------------------------------------------------
static std::string readFile(const std::string& path) {
    std::ifstream f(path, std::ios::binary);
    if (!f) return "";
    std::ostringstream ss;
    ss << f.rdbuf();
    return ss.str();
}

static bool sendAll(SOCKET s, const char* data, size_t len) {
    size_t sent = 0;
    while (sent < len) {
        int n = send(s, data + sent, (int)(len - sent), 0);
        if (n <= 0) return false;
        sent += (size_t)n;
    }
    return true;
}

static std::string makeResponse(int code, const std::string& status,
                                const std::string& contentType, const std::string& body) {
    std::ostringstream oss;
    oss << "HTTP/1.1 " << code << " " << status << "\r\n"
        << "Content-Type: " << contentType << "; charset=utf-8\r\n"
        << "Content-Length: " << body.size() << "\r\n"
        << "Connection: close\r\n"
        << "\r\n"
        << body;
    return oss.str();
}

static size_t getContentLength(const std::string& headers) {
    std::string h = toLower(headers);
    size_t pos = h.find("content-length:");
    if (pos == std::string::npos) return 0;
    pos += 15;
    size_t end = h.find("\r\n", pos);
    std::string val = h.substr(pos, end == std::string::npos ? std::string::npos : end - pos);
    try { return (size_t)std::stoll(val); } catch (...) { return 0; }
}

static std::string getQueryParam(const std::string& query, const std::string& key) {
    size_t start = 0;
    while (start < query.size()) {
        size_t amp = query.find('&', start);
        std::string pair = query.substr(start, amp == std::string::npos ? std::string::npos : amp - start);
        size_t eq = pair.find('=');
        if (eq != std::string::npos && pair.substr(0, eq) == key) return pair.substr(eq + 1);
        if (amp == std::string::npos) break;
        start = amp + 1;
    }
    return "";
}

static std::string urlDecode(const std::string& s) {
    std::string r;
    for (size_t i = 0; i < s.size(); i++) {
        if (s[i] == '+') r += ' ';
        else if (s[i] == '%' && i + 2 < s.size()) {
            int v = 0;
            std::istringstream hex(s.substr(i + 1, 2));
            if (hex >> std::hex >> v) { r += (char)v; i += 2; }
            else r += s[i];
        }
        else r += s[i];
    }
    return r;
}

static std::string jsonStrField(const std::string& body, const std::string& key) {
    std::string pat = "\"" + key + "\"";
    size_t k = toLower(body).find(pat);
    if (k == std::string::npos) return "";
    size_t colon = body.find(':', k + pat.size());
    if (colon == std::string::npos) return "";
    size_t q1 = body.find('"', colon + 1);
    if (q1 == std::string::npos) return "";
    size_t q2 = body.find('"', q1 + 1);
    if (q2 == std::string::npos) return "";
    return body.substr(q1 + 1, q2 - q1 - 1);
}

static double jsonNumField(const std::string& body, const std::string& key, bool& found) {
    found = false;
    std::string pat = "\"" + key + "\"";
    size_t k = toLower(body).find(pat);
    if (k == std::string::npos) return 0;
    size_t colon = body.find(':', k + pat.size());
    if (colon == std::string::npos) return 0;
    size_t start = colon + 1;
    while (start < body.size() && body[start] == ' ') start++;
    size_t end = start;
    while (end < body.size() && body[end] != ',' && body[end] != '}') end++;
    try { found = true; return std::stod(body.substr(start, end - start)); }
    catch (...) { return 0; }
}

static void printLog(const char* tag, const std::vector<std::string>& log) {
    std::cout << "===== " << tag << " =====" << std::endl;
    for (const std::string& line : log) std::cout << line << std::endl;
}

static std::string handleRequest(const std::string& req) {
    size_t lineEnd = req.find("\r\n");
    if (lineEnd == std::string::npos)
        return makeResponse(400, "Bad Request", "application/json", "{\"ok\":false,\"error\":\"request tidak valid\"}");

    std::istringstream iss(req.substr(0, lineEnd));
    std::string method, target, version;
    iss >> method >> target >> version;

    size_t q = target.find('?');
    std::string path = (q == std::string::npos) ? target : target.substr(0, q);
    std::string query = (q == std::string::npos) ? "" : urlDecode(target.substr(q + 1));

    size_t bodyPos = req.find("\r\n\r\n");
    std::string body = (bodyPos == std::string::npos) ? "" : req.substr(bodyPos + 4);

    std::cout << "[HTTP] " << method << " " << target << std::endl;

    // --- Halaman web (frontend) ---
    if (method == "GET" && path == "/") {
        std::string html = readFile("index.html");
        if (html.empty())
            return makeResponse(500, "Internal Error", "text/plain", "index.html tidak ditemukan. Jalankan server.exe dari folder proyek.");
        return makeResponse(200, "OK", "text/html", html);
    }
    if (method == "GET" && path == "/style.css") {
        std::string css = readFile("style.css");
        return css.empty() ? makeResponse(404, "Not Found", "text/plain", "not found")
                           : makeResponse(200, "OK", "text/css", css);
    }
    if (method == "GET" && path == "/app.js") {
        std::string js = readFile("app.js");
        return js.empty() ? makeResponse(404, "Not Found", "text/plain", "not found")
                          : makeResponse(200, "OK", "application/javascript", js);
    }

    // --- API: daftar produk ---
    if (method == "GET" && path == "/api/products") {
        std::ostringstream json;
        json << "{\"ok\":true,\"count\":" << productCount << ",\"products\":" << productsToJson() << "}";
        return makeResponse(200, "OK", "application/json", json.str());
    }

    // --- API: tambah produk ---
    if (method == "POST" && path == "/api/products") {
        std::string name = jsonStrField(body, "name");
        std::string category = jsonStrField(body, "category");
        bool fPrice = false, fStock = false;
        double price = jsonNumField(body, "price", fPrice);
        double stock = jsonNumField(body, "stock", fStock);

        if (name.empty() || category.empty() || !fPrice || !fStock ||
            price < 0 || stock < 0) {
            return makeResponse(400, "Bad Request", "application/json",
                              "{\"ok\":false,\"error\":\"Data tidak valid: nama/kategori tidak boleh kosong, harga & stok harus >= 0\"}");
        }

        // Toko khusus perangkat audio personal: kategori di luar whitelist DITOLAK
        if (!isAudioCategory(category)) {
            return makeResponse(400, "Bad Request", "application/json",
                              "{\"ok\":false,\"error\":\"Kategori tidak valid. Kategori yang diterima: Headphone, Headset, TWS, Earphone\"}");
        }

        std::vector<std::string> log;
        bool ok = addProduct(name, category, price, (int)stock, log);
        printLog("TAMBAH PRODUK", log);

        std::ostringstream json;
        json << "{\"ok\":" << (ok ? "true" : "false")
             << ",\"count\":" << productCount
             << ",\"products\":" << productsToJson()
             << ",\"log\":" << logToJson(log) << "}";
        return makeResponse(ok ? 200 : 500, ok ? "OK" : "Internal Error", "application/json", json.str());
    }

    // --- API: sorting (Bubble Sort) ---
    if (method == "GET" && path == "/api/sort") {
        std::string order = toLower(getQueryParam(query, "order"));
        if (order != "asc" && order != "desc")
            return makeResponse(400, "Bad Request", "application/json",
                              "{\"ok\":false,\"error\":\"Parameter order harus 'asc' atau 'desc'\"}");

        bool ascending = (order == "asc");
        SortResult sr = bubbleSort(ascending);
        printLog("SORTING (BUBBLE SORT)", sr.log);

        std::ostringstream json;
        json << "{\"ok\":true,\"order\":\"" << order
             << "\",\"compares\":" << sr.compares
             << ",\"swaps\":" << sr.swaps
             << ",\"passes\":" << sr.passes
             << ",\"summary\":\"Bubble Sort " << (ascending ? "ASCENDING" : "DESCENDING")
             << " selesai: " << sr.passes << " pass, " << sr.compares << " perbandingan, "
             << sr.swaps << " swap\""
             << ",\"log\":" << logToJson(sr.log)
             << ",\"products\":" << productsToJson() << "}";
        return makeResponse(200, "OK", "application/json", json.str());
    }

    // --- API: searching (Linear Search) ---
    if (method == "GET" && path == "/api/search") {
        std::string q = getQueryParam(query, "q");
        std::string by = toLower(getQueryParam(query, "by"));
        if (q.empty())
            return makeResponse(400, "Bad Request", "application/json",
                              "{\"ok\":false,\"error\":\"Parameter q (kata kunci) wajib diisi\"}");
        if (by != "name" && by != "category")
            return makeResponse(400, "Bad Request", "application/json",
                              "{\"ok\":false,\"error\":\"Parameter by harus 'name' atau 'category'\"}");

        bool byName = (by == "name");
        SearchResult sr = linearSearch(q, byName);
        printLog("SEARCHING (LINEAR SEARCH)", sr.log);

        std::ostringstream hitsJson;
        hitsJson << "[";
        for (size_t i = 0; i < sr.hits.size(); i++) {
            if (i) hitsJson << ",";
            hitsJson << productToJson(*sr.hits[i]);   // DEREFERENCE pointer hasil
        }
        hitsJson << "]";

        std::ostringstream json;
        json << "{\"ok\":true,\"by\":\"" << by << "\",\"q\":\"" << jsonEscape(q)
             << "\",\"count\":" << sr.hits.size()
             << ",\"checks\":" << sr.checks
             << ",\"summary\":\"Linear Search (" << (byName ? "nama" : "kategori")
             << ") selesai: " << sr.checks << " pemeriksaan, " << sr.hits.size()
             << " produk ditemukan untuk query \\\"" << jsonEscape(q) << "\\\"\""
             << ",\"log\":" << logToJson(sr.log)
             << ",\"products\":" << hitsJson.str() << "}";
        return makeResponse(200, "OK", "application/json", json.str());
    }

    return makeResponse(404, "Not Found", "application/json", "{\"ok\":false,\"error\":\"endpoint tidak ditemukan\"}");
}

// ----------------------------------------------------------------------------
// Data awal (seed) - juga memperlihatkan penggunaan addProduct (pointer)
// ----------------------------------------------------------------------------
static void seedData() {
    // Katalog khusus perangkat audio personal (Headphone, Headset, TWS, Earphone).
    // Nama & model disesuaikan dengan foto studio dari Wikimedia Commons
    // agar gambar yang ditampilkan sesuai dengan produknya.
    const char* names[]      = { "Headphone Sony WH-1000XM3",
                                 "Headset Gaming ELECOM HS-ARMA100WH",
                                 "TWS Apple AirPods Pro",
                                 "TWS Apple AirPods Pro 2",
                                 "Headphone Audio-Technica ATH-M50",
                                 "TWS Samsung Galaxy Buds2 Pro",
                                 "Headphone Bose QuietComfort 25",
                                 "Earphone Apple EarPods",
                                 "Earphone Xiaomi Hybrid Dual Driver" };
    const char* categories[] = { "Headphone", "Headset", "TWS", "TWS",
                                 "Headphone", "TWS",
                                 "Headphone", "Earphone", "Earphone" };
    const double prices[]    = { 3450000, 749000, 3999000, 4499000,
                                 2450000, 2299000,
                                 1850000, 349000, 199000 };
    const int stocks[]       = { 12, 15, 9, 7, 8, 11, 6, 40, 35 };
    const int n = sizeof(names) / sizeof(names[0]);
    for (int i = 0; i < n; i++) {
        std::vector<std::string> log;
        addProduct(names[i], categories[i], prices[i], stocks[i], log);
    }
    std::cout << "[INIT] " << productCount << " produk audio awal dimuat ke dalam array (struct Product)." << std::endl;
}

int main() {
    SetConsoleOutputCP(CP_UTF8);   // agar log Indonesia tampil benar di console Windows

    seedData();

    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
        std::cerr << "WSAStartup gagal: " << WSAGetLastError() << std::endl;
        return 1;
    }

    SOCKET server = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (server == INVALID_SOCKET) {
        std::cerr << "Socket gagal dibuat: " << WSAGetLastError() << std::endl;
        WSACleanup();
        return 1;
    }

    sockaddr_in addr;
    ZeroMemory(&addr, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);   // 127.0.0.1 (hanya lokal, aman)
    addr.sin_port = htons(8080);

    if (bind(server, (sockaddr*)&addr, sizeof(addr)) == SOCKET_ERROR) {
        std::cerr << "Gagal bind ke port 8080 (mungkin sudah dipakai?): " << WSAGetLastError() << std::endl;
        closesocket(server);
        WSACleanup();
        return 1;
    }
    if (listen(server, SOMAXCONN) == SOCKET_ERROR) {
        std::cerr << "Listen gagal: " << WSAGetLastError() << std::endl;
        closesocket(server);
        WSACleanup();
        return 1;
    }

    std::cout << "=======================================================" << std::endl;
    std::cout << "  SONOVA - Toko Audio Online (UTS Struktur Data)" << std::endl;
    std::cout << "  Server C++ (Array, Pointer, Struct, Bubble Sort," << std::endl;
    std::cout << "  Linear Search) berjalan di: http://localhost:8080" << std::endl;
    std::cout << "  Tekan Ctrl+C untuk berhenti." << std::endl;
    std::cout << "=======================================================" << std::endl;

    while (true) {
        SOCKET client = accept(server, nullptr, nullptr);
        if (client == INVALID_SOCKET) continue;

        std::string req;
        char buf[4096];

        // Baca sampai header lengkap
        while (req.find("\r\n\r\n") == std::string::npos) {
            int n = recv(client, buf, sizeof(buf), 0);
            if (n <= 0) break;
            req.append(buf, (size_t)n);
        }

        // Baca body POST sesuai Content-Length
        size_t bodyPos = req.find("\r\n\r\n");
        if (bodyPos != std::string::npos) {
            size_t need = bodyPos + 4 + getContentLength(req.substr(0, bodyPos));
            while (req.size() < need) {
                int n = recv(client, buf, sizeof(buf), 0);
                if (n <= 0) break;
                req.append(buf, (size_t)n);
            }
        }

        if (!req.empty()) {
            std::string resp = handleRequest(req);
            sendAll(client, resp.data(), resp.size());
        }
        closesocket(client);
    }

    closesocket(server);
    WSACleanup();
    return 0;
}
