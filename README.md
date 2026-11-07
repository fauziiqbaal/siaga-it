# Siaga IT — Pre-Opening & Opening Checklist (Coliving / Rukita)

Aplikasi QC lapangan untuk tim IT opening properti coliving: **Setup Gedung → Pre-Opening → Opening → Skor + laporan PDF**.
Dipakai di browser HP/tablet sambil berkeliling gedung, lalu dicetak sebagai berita acara.

---

## 1. Kondisi awal aplikasi: KOSONG (bukan demo)

Dulu aplikasi memuat properti contoh (`INITIAL_BUILDINGS`) dan punya fallback
`value.length > 0 ? value : SEED`. Akibatnya setiap kali semua gedung dihapus —
atau saat refresh di lingkungan yang memblokir localStorage — properti demo
muncul lagi dan aplikasi terasa "hanya demo".

Sekarang:

- `INITIAL_BUILDINGS = []`, `INITIAL_ISSUES = []`. Tidak ada seeding properti,
  kendala, maupun foto bukti contoh saat aplikasi dibuka.
- Kalau belum ada properti, aplikasi menampilkan layar **“Belum ada properti”**
  dengan form gedung pertama (nama, alamat, lantai, kamar per lantai, target live,
  TV/smartlock).
- Menghapus gedung terakhir **diperbolehkan**; layar kembali ke onboarding.
- Data contoh hanya dipakai skrip uji/laporan (`src/data/mockData.ts` →
  `SAMPLE_BUILDINGS`, `scripts/fixtures/`), tidak pernah masuk otomatis ke aplikasi.
- File JSON contoh bisa dimuat manual lewat tombol **“Muat dari backup JSON”**.

---

## 2. Data disimpan di mana?

Tidak perlu database/server. Aplikasi ini **offline-first**:

| Data | Lokasi | Keterangan |
| --- | --- | --- |
| Gedung, lantai, kamar, area, CCTV, perangkat, billing | `localStorage` → `siaga_it_v2:buildings` | envelope `{ v, savedAt, data }` |
| Kendala/tiket vendor | `localStorage` → `siaga_it_v2:issues` | ikut terhapus saat gedung dihapus |
| Gedung aktif, tab aktif, tema | `siaga_it_v2:active_building`, `active_tab`, `theme_dark` | supaya refresh kembali ke layar terakhir |
| Pengguna & PIN | `localStorage` → `siaga_it_users` | dikelola di menu Lain → Pengguna |
| Foto bukti QC | IndexedDB (`src/utils/evidenceStorage.ts`) | fallback localStorage bila IndexedDB mati |

Perilaku penyimpanan:

- Setiap perubahan ditulis otomatis (debounce 250 ms) + dipaksa simpan saat tab
  ditutup (`pagehide`/`visibilitychange`) dan lewat `saveNow()`.
- Kuota penuh: lampiran base64 besar dibuang lebih dulu, **data teks tidak hilang**.
- `checkStorage()` menulis-membaca kunci probe. Kalau browser memblokir
  (mode privat / file:// / iframe ketat), muncul **banner merah** “Data belum aman
  tersimpan” + tombol ekspor JSON — bukan diam-diam kehilangan data.
- **Backup**: menu **Lain → Ekspor backup / Impor backup** (file JSON berisi
  gedung + kendala + user). Ini juga cara memindahkan data ke perangkat lain.

> Catatan jujur: localStorage terikat pada satu browser + satu origin. Untuk tim
> yang ingin data yang sama di beberapa perangkat, jalankan `python serve.py`
> (lihat bagian 3) — data dicerminkan ke `data/siaga-it.json`.

### Sinkron JSON antar perangkat (opsional, tanpa database)

`python serve.py` menjalankan web + API kecil:

| Endpoint | Fungsi |
| --- | --- |
| `GET /api/health` | status server + jumlah gedung di file JSON |
| `GET /api/state` | snapshot terakhir (204 kalau kosong) |
| `PUT /api/state` | simpan snapshot ke `data/siaga-it.json` (atomic + `.bak`) |
| `GET /api/wifi` | sinyal Wi-Fi perangkat **agen** (dBm asli bila OS mendukung) |

Aturan yang dipakai aplikasi (sengaja sederhana, *last write wins*):

1. Perangkat yang sudah punya data lokal → otomatis mengirim ke server (debounce 1,2 dtk).
2. Perangkat baru / storage kosong → otomatis mengambil data server.
3. Dua orang mengedit bersamaan → yang terakhir menyimpan menang. Tombol
   **Lain → Tarik dari server** untuk memaksa ambil versi server.
4. Server mati → aplikasi tetap jalan penuh dengan localStorage (badge “lokal saja”).

`data/` masuk `.gitignore`; isinya bisa dicopy/di-backup seperti file biasa.

---

## 3. CRUD: sudah lengkap?

| Objek | Create | Read | Update | Delete | Di mana |
| --- | --- | --- | --- | --- | --- |
| Gedung/properti | ✅ form onboarding & “+ Gedung” | ✅ daftar gedung, pencarian | ✅ identitas, jadwal, retensi NVR | ✅ tombol “Hapus gedung ini” + PIN | Setup / modal gedung |
| Lantai | ✅ “+ Lantai” | ✅ daftar per lantai | ✅ nama lantai | ✅ “Kelola” → Hapus lantai (kamar & area ikut terhapus) | Setup |
| Kamar | ✅ “+ Kamar” & tambah massal (1–60 sekaligus) | ✅ chip kamar | ✅ nomor, TV, smartlock, catatan | ✅ di sheet kamar | Setup |
| Area bersama | ✅ “+ Area” | ✅ daftar | ✅ nama, tipe, fasilitas | ✅ di sheet area | Setup |
| Titik CCTV | ✅ template + tambah manual | ✅ daftar titik | ✅ status, rekaman, takeover | ✅ di fase Pre-Opening → CCTV | Pre-Opening |
| Perangkat IT | ✅ template + tambah manual | ✅ daftar | ✅ merek, SN, IP, config, SSID | ✅ di fase Pre-Opening → Aset | Pre-Opening |
| Billing ISP | ✅ tambah koneksi | ✅ daftar | ✅ paket, CID, email, takeover | ✅ hapus koneksi | Setup / Opening |
| Kendala/vendor | ✅ tambah manual | ✅ daftar + filter | ✅ tandai selesai / re-QC | ✅ tombol Hapus | Pre-Opening / Lain |
| Pengguna | ✅ tambah | ✅ daftar | ✅ role, PIN, hak akses | ✅ hapus (bukan admin terakhir) | Lain → Pengguna |

Yang **belum** ada: sinkronisasi realtime per-field (sekarang snapshot
last-write-wins) dan login terpusat. Keduanya bukan blocker opening.

---

## 4. Alur 3 fase + 2 skor

| Fase | Halaman | Isi |
| --- | --- | --- |
| 1. Setup Gedung | `Gedung` | identitas & jadwal, lantai + kamar (kode otomatis), area bersama, ISP/CID/email billing |
| 2. Pre-Opening | `Pre-Opening` | uji Wi-Fi nyata (speedtest byte asli), CCTV + retensi NVR, TV, smartlock (RFID, baterai), aset, kendala |
| 3. Opening | `Opening` | standardisasi SSID guest/ops/IoT, konfigurasi perangkat, takeover akun + CCTV standalone + TTLock, takeover billing, serah terima |
| Laporan | `Skor` | **Pre-Opening Score** & **Opening Score** 0–100, grade A–D, daftar blocker, pratinjau A4 |

Skor dihitung di `src/utils/scoring.ts` hanya dari data yang benar-benar diisi
(tidak ada angka simulasi).


---

## 5. Laporan PDF (A4)

- Di aplikasi: tab **Skor → Cetak / PDF** (`window.print()`). Yang tercetak hanya
  dokumen A4 (`PrintableReport`), bukan menu/tombol.
- Dokumen berisi: identitas properti, ringkasan dua skor, tabel pilar + catatan,
  blocker, hasil uji tiap kamar (Mbps/dBm/TV/smartlock), area bersama, titik CCTV,
  perangkat + takeover, billing ISP, dan daftar kendala. (Blok tanda tangan serah
  terima sengaja tidak dicetak — berita acara ditandatangani terpisah.)
- Status ditulis **LULUS / GAGAL / BELUM / N/A** sehingga tetap terbaca saat
  dicetak hitam-putih.
- Hasil PDF siap pakai bisa dibuat tanpa membuka browser:

```bash
npm run report:pdf
# reports/laporan-it-kebon-jeruk.pdf   (contoh properti terisi, 3 halaman)
# reports/laporan-it-kebon-jeruk.html  (versi HTML, CSS disalin ke reports/assets)
```

---

## 5b. Aplikasi Android — dBm otomatis dari sensor HP

Browser tidak punya API untuk membaca RSSI. Supaya dBm bisa otomatis, repo ini
sudah disiapkan sebagai shell **Capacitor** dengan plugin native:

| Bagian | Berkas |
| --- | --- |
| Konfigurasi shell | `capacitor.config.ts` (appId `co.rukita.siagait`, webDir `dist`) |
| Project Android | `android/` (hasil `npx cap add android`) |
| Plugin native | `android/app/src/main/java/co/rukita/siagait/WifiSignalPlugin.java` |
| Registrasi plugin | `MainActivity.java` (`registerPlugin(WifiSignalPlugin.class)`) |
| Izin | `ACCESS_WIFI_STATE`, `ACCESS_FINE_LOCATION` (Android mewajibkan izin lokasi untuk info Wi-Fi), `NEARBY_WIFI_DEVICES` |
| Jembatan web | `src/lib/wifiSignal.ts` (`isNativeApp()`, `readNativeWifiSignal()`) |
| UI | `SpeedtestSheet`: tombol **“Baca HP”** hanya muncul di APK |

Cara kerja: plugin memanggil `WifiManager.getRssi()` (dBm asli). Kalau Android
tidak memberi nilai (izin ditolak, GPS mati, atau sedang pakai data seluler),
plugin mengembalikan `supported:false` → aplikasi menampilkan pesan dan dBm
**tetap diisi manual**. Tidak ada angka estimasi. Sumber dBm tersimpan sebagai
`wifiTestSource: 'NATIVE'`.

Build (butuh JDK 17 + Android SDK / Android Studio):

```bash
npm run android:sync        # build web lalu salin ke android/
npm run android:open        # jalankan dari Android Studio (lebih mudah untuk izin & debug)
# atau
npm run android:apk         # android/app/build/outputs/apk/debug/app-debug.apk
```

Sinkron server dari APK (halaman berjalan di `https://localhost`, jadi `/api`
relatif tidak menuju serve.py):

```bash
VITE_API_BASE=http://192.168.1.10:5173 npm run build
npx cap sync android
```

Status pengujian di mesin ini: jalur JS + UI diuji lewat `npm run check:native`
(Chrome dengan `window.Capacitor` palsu → dBm terisi -54, label “dBm sensor HP”).
**APK belum di-build di sini** karena JDK/Android SDK tidak terpasang — kode Java
perlu diverifikasi saat pertama kali build di Android Studio.

---

## 6. Perintah

```bash
npm run dev            # dev server (http://localhost:5174/ — API diproxy ke 8790)
npm run build          # typecheck (tsc -b) + build produksi ke dist/
npm run lint           # oxlint
python serve.py        # web + API JSON di http://localhost:5173
                       #   env: PORT=8080 API_PORT=8790 DATA_DIR=data

npm run check:storage  # reload, payload rusak, kuota penuh
npm run check:crud     # create -> refresh -> update -> refresh -> delete
npm run check:scoring  # bobot & perhitungan dua skor
npm run check:render   # SSR smoke test semua tab (termasuk kondisi kosong)
npm run check:all      # jalankan 4 uji di atas

npm run check:e2e      # Chrome: isi form -> refresh -> tambah/hapus lantai -> hapus gedung
npm run check:sync     # dua profil Chrome: data dari server terpakai di perangkat lain
npm run check:native   # simulasi plugin RSSI Android (mock Capacitor) -> dBm terisi -54
npm run report:pdf     # laporan A4 contoh
npm run shots          # PDF + screenshot (SSR)
npm run shots:live     # screenshot aplikasi yang benar-benar berjalan + badge server

npm run android:sync   # build web + salin ke android/ (Capacitor)
npm run android:open   # buka project Android di Android Studio
npm run android:apk    # build APK debug (butuh JDK 17 + Android SDK)
```

`check:e2e`, `check:sync`, dan `shots:live` memakai Chrome headless lewat DevTools
Protocol (tanpa dependency tambahan). Jalankan `npm run build` lebih dulu; `check:sync`
juga butuh Python.

Kalau `npm run dev` dipakai bersamaan dengan `python serve.py`, jalankan
`python serve.py` lebih dulu supaya API di port 8790 hidup (Vite mem-proxy `/api`).

---

## 7. Struktur utama

```
src/
  App.tsx                       shell + state persisten + navigasi fase
  hooks/usePersistentState.ts   state yang bertahan refresh (+ saveNow)
  hooks/useBackNavigation.ts    guard tombol back HP
  hooks/useServerSync.ts        sinkron JSON antar perangkat (aktif bila server hidup)
  lib/storage.ts                envelope localStorage, health check, backup
  lib/serverSync.ts             probe / pull / push ke /api/state
  lib/wifiSignal.ts             jembatan plugin native RSSI (APK Android)
  components/
    setup/OnboardingView.tsx    layar "Belum ada properti" (gedung pertama)
    setup/BuildingSetupView.tsx fase 1: lantai (kelola/hapus), kamar massal, area, billing
    preopening/PreOpeningView.tsx fase 2: Wi-Fi, CCTV, TV, lock, aset, kendala
    opening/OpeningView.tsx     fase 3: SSID, perangkat, takeover, serah terima
    reports/ScoreReportView.tsx ringkasan skor + tombol cetak
    reports/PrintableReport.tsx dokumen A4 (dipakai juga oleh scripts/)
    shared/buildingFactory.ts   pembuat gedung/kamar/CCTV/perangkat
    ui/kit.tsx                  Card, Section, Btn, Sheet, Segmented, dll
  utils/scoring.ts              Pre-Opening Score & Opening Score
  data/mockData.ts              APP_USERS + SAMPLE_* (hanya untuk skrip)

serve.py                        static server + API JSON (/api/health, /api/state, /api/wifi)

android/                        shell Capacitor (APK) + plugin native WifiSignalPlugin
capacitor.config.ts             appId, webDir dist

scripts/
  check-storage.ts / check-crud.ts / check-scoring.ts / ssr-check.tsx
  e2e-browser.mjs               uji browser nyata (CRUD + kelola lantai + persistensi)
  check-sync.mjs                uji dua perangkat lewat serve.py
  check-native.mjs              uji jembatan plugin RSSI (mock Capacitor)
  live-shots.mjs                screenshot aplikasi berjalan + perangkat kedua
  lib/browser.mjs               helper CDP (server, Chrome, evaluate)
  report-ssr.tsx                generator PDF A4
  app-shots.tsx                 screenshot SSR semua fase
  fixtures/sample-property.ts   properti lengkap untuk laporan/uji

.agents/skills/                 hotel-qc-opening, engineering-programming, ui-ux
reports/                        PDF, HTML laporan, screenshot (hasil generate)
data/                           JSON runtime server (gitignored)
```

---

## 8. Bukti uji (hasil terakhir di mesin ini)

```
check:storage  → reload MATCH · payload rusak fallback OK · kuota penuh teks aman
check:crud     → CREATE 18 kamar (101-306), 8 CCTV, 6 perangkat
                 UPDATE kamar 204 = 82 Mbps / PASS
                 SCORING pre-opening 100 (A) · opening 100 (A)
                 DELETE gedung + kendala hilang permanen setelah reload
check:render   → semua tab + kondisi kosong + "properti demo tidak muncul" OK
check:e2e      → 1) kosong tanpa demo  2) gedung dibuat dari form UI
                 3) tersimpan (1 gedung, 6 kamar/lantai) 4) refresh: data tetap
                 4b) tambah 2 kamar massal (6 -> 8, nomor 107-108) via sheet lantai
                 4c) hapus lantai via UI (3 -> 2 lantai)
                 5) hapus gedung via UI -> layar kosong, bukan demo
check:sync     → perangkat 1 kirim ke server · perangkat 2 (profil baru, storage
                 kosong) otomatis memuat data dari data/siaga-it.json
report:pdf     → reports/laporan-it-kebon-jeruk.pdf (3 halaman, A4)
shots          → reports/shots/*.png (SSR)
shots:live     → reports/shots-live/*.png (aplikasi berjalan + badge server +
                 sheet kelola lantai + tampilan HP perangkat kedua)
```

Screenshot & PDF ada di folder `reports/` dan sengaja ikut disimpan supaya bisa
langsung dibuka tanpa menjalankan aplikasi.

---

## 9. Batasan yang perlu diketahui

- Bukan sistem login sungguhan: PIN dicek di browser (cocok untuk alat internal,
  bukan untuk data publik).
- Tanpa server: data terikat browser (pakai Ekspor/Impor JSON untuk pindah).
- **Sinyal Wi-Fi (dBm) tidak bisa dibaca browser** — tidak ada API-nya. Di aplikasi
  dBm diisi manual (atau dari Wi-Fi analyzer di HP). `GET /api/wifi` hanya membaca
  adapter perangkat yang menjalankan `serve.py`; dBm asli tersedia di Linux (`iw`)
  dan macOS (`airport`), sedangkan Windows/Netsh umumnya hanya persen sehingga
  `dbm` sengaja dibiarkan `null` (tidak dikonversi/estimasi).
- Dengan `serve.py`: data dicerminkan ke satu file JSON; kalau dua teknisi
  mengedit snapshot yang sama, **yang terakhir menyimpan menang**.
- API server tanpa autentikasi — hanya untuk LAN kantor, jangan di-expose ke internet.
- Jangan membuka `dist/index.html` lewat `file://` — browser memblokir localStorage.
  Jalankan `npm run dev` atau `python serve.py`, lalu buka `http://localhost:5173`.
