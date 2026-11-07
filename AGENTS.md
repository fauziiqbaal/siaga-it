# Siaga IT — Hotel Pre-Opening & QC Checklist Standards

## 1. Project Overview
A clean, high-utility, minimalist **IT Engineering Pre-Opening & Live Readiness Checklist** specifically focused on the 4 core IT operational pillars for hospitality:
1. **Internet & Wi-Fi** (Throughput >= 15 Mbps, AP roaming, SSID captive portal, LAN ports)
2. **CCTV & Security** (IP camera streams, NVR 30-day retention, coverage angles, motion recording)
3. **Cable TV & IPTV** (Channel lineup, STB handshake, sound sync, casting test)
4. **Smartlock & Access Door** (RFID master/guest card tap < 1s, Bluetooth BLE mobile key, battery levels > 80%, deadbolt alignment)

## 2. Technical Stack
- **Framework**: React 18+ with TypeScript (Vite bundler)
- **Styling**: Tailwind CSS (Clean Slate/Zinc 950 theme, subtle borders, high contrast, non-bloated)
- **Icons**: Lucide React
- **Responsiveness**: Mobile (375px+), Tablet (iPad), and Desktop Web.

## 3. UI/UX Principles
- **Simple, Direct & Pragmatic**: Avoid bloated AI-generated templates, tacky gold glows, or marketing fluff. Build a professional developer/engineer utility tool.
- **Fast 1-Click QC**: Quick Pass / Fail toggles for field engineers walking through floors and rooms.
- **Direct Vendor Escalation**: When a test fails, easily create and assign tickets to vendors (ISP Biznet/Telkom, Salto Smartlock, Hikvision CCTV, Samsung IPTV).

## 4. Alur Implementasi (3 Fase + 2 Skor)

Aplikasi mengikuti siklus onboarding properti, bukan sekadar daftar checklist:

1. **Setup Gedung** — identitas, jumlah lantai, kamar per lantai (kode otomatis), area bersama, data ISP/CID/email billing. Data ini dipakai ulang pada visit berikutnya.
2. **Pre-Opening** — inventaris aset, uji lapangan (Wi-Fi nyata, CCTV + retensi, TV, smartlock), coverage pengujian, dan pencatatan koreksi/kendala vendor.
3. **Opening** — standardisasi SSID (guest/ops/IoT), konfigurasi perangkat, takeover akun perangkat/CCTV standalone/TTLock, takeover billing ISP, dan berita acara serah terima.

Dua lembar penilaian wajib ada di setiap gedung: **Pre-Opening Score** dan **Opening Score** (`src/utils/scoring.ts`), masing-masing 0–100 dengan grade A–D dan daftar blocker.

## 5. Aturan Teknis Wajib

- **Tanpa data demo**: kondisi awal aplikasi KOSONG (`INITIAL_BUILDINGS = []`). Dilarang mengembalikan fallback `value.length > 0 ? value : SEED` atau men-seed properti/bukti contoh otomatis; properti demo hanya boleh masuk lewat impor backup yang dipilih user. Data contoh untuk skrip ada di `src/data/mockData.ts` (`SAMPLE_BUILDINGS`) dan `scripts/fixtures/`.
- **Persistensi**: semua input yang bertahan antar-visit harus memakai `usePersistentState` (`src/hooks/usePersistentState.ts`). Dilarang menyimpan data QC hanya di `useState` biasa. Status simpan wajib terlihat (`Tersimpan …`) dan banner merah muncul jika browser memblokir localStorage (`checkStorage()`).
- **CRUD penuh**: gedung, lantai, kamar, area bersama, titik CCTV, perangkat, billing ISP, kendala, dan user harus bisa dibuat, dibaca, diubah, dan dihapus dari UI. Menghapus gedung terakhir diperbolehkan dan mengembalikan layar onboarding.
- **Navigasi HP**: gunakan `useBackNavigation` + `Sheet` dari `src/components/ui/kit.tsx`. Tombol back tidak boleh meninggalkan aplikasi dan tidak boleh menghapus input.
- **Tanpa ikon dekoratif**: UI fase baru memakai label teks, target sentuh ≥ 38px, tabel sederhana. Ikon Lucide hanya untuk layar legacy di menu "Lain".
- **Speedtest harus nyata**: `SpeedtestSheet` mengukur byte asli. Browser tidak bisa membaca RSSI, jadi dBm hanya boleh berasal dari **input manual** (Wi-Fi analyzer) atau **plugin native** `WifiSignal` di APK Android (`wifiTestSource: 'NATIVE'`). Dilarang mengonversi persen sinyal/throughput menjadi dBm — kalau sensor tidak memberi nilai, biarkan kosong.
- **Laporan cetak**: `src/components/reports/PrintableReport.tsx` adalah satu-satunya dokumen A4. Pakai tabel + teks LULUS/GAGAL (bukan warna saja), jangan pakai tag `<header>` (CSS cetak global menyembunyikannya), dan pastikan `npm run report:pdf` menghasilkan PDF yang terbaca.
- **Sinkron server opsional**: `serve.py` menyediakan `/api/state` (JSON di `data/siaga-it.json`). `useServerSync` hanya boleh menulis snapshot utuh, tidak boleh mengosongkan server dengan state basi, dan aplikasi harus tetap berfungsi penuh saat server mati (badge "lokal saja"). API tanpa login: khusus LAN.

## 6. Bukti & Perintah Uji

```bash
npm run dev            # jalankan lokal (http://localhost:5174, /api diproxy ke 8790)
npm run build          # typecheck + build produksi
npm run check:all      # storage + CRUD + scoring + render
npm run check:e2e      # Chrome: isi form -> refresh -> kelola lantai -> hapus
npm run check:sync     # dua profil Chrome lewat serve.py (data dibagi)
npm run check:native   # mock plugin RSSI Android -> dBm terisi otomatis
npm run report:pdf     # reports/laporan-it-kebon-jeruk.pdf
npm run shots          # PDF + screenshot SSR (reports/shots)
npm run shots:live     # screenshot aplikasi berjalan + badge server
npm run android:sync   # build web + salin ke android/
npm run android:apk    # build APK debug (butuh JDK 17 + Android SDK)
python serve.py        # web + API JSON (port 5173; API_PORT=8790 untuk dev)
```

## 7. Skills

| Skill | Isi |
| --- | --- |
| `.agents/skills/hotel-qc-opening` | Domain coliving/Rukita: pilar IT, alur 3 fase |
| `.agents/skills/engineering-programming` | Kontrak persistensi, aturan CRUD, konvensi TS, perintah uji |
| `.agents/skills/ui-ux` | Token visual, target sentuh, pola sheet, aturan laporan A4 |


