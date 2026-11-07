---
name: engineering-programming
description: Aturan rekayasa perangkat lunak untuk aplikasi Siaga IT (React 19 + TypeScript + Vite + Tailwind). Dipakai saat menambah fitur, memperbaiki bug persistensi/CRUD, atau menulis skrip uji.
---

# Engineering / Programming — Siaga IT

Skill ini adalah **cara kerja kode** di repo ini. Tujuannya: aplikasi tetap kecil,
mudah dirawat, dan perilakunya bisa dibuktikan dengan uji otomatis.

---

## 1. Stack & struktur

| Lapisan | Berkas | Catatan |
| --- | --- | --- |
| Shell + state global | `src/App.tsx` | Satu tempat untuk `buildings`, `issues`, user, tab aktif |
| Persistensi | `src/lib/storage.ts`, `src/hooks/usePersistentState.ts` | localStorage ber-envelope `{v, savedAt, data}` |
| Model domain | `src/types/hotel.ts` | Semua tipe `Building`, `RoomColiving`, `CCTVPoint`, `ITDevice`, `ColivingIssue` |
| Factory | `src/components/shared/buildingFactory.ts` | Satu-satunya cara membuat gedung/kamar/CCTV/perangkat |
| Penilaian | `src/utils/scoring.ts` | Pre-Opening Score & Opening Score (0–100) |
| UI | `src/components/ui/kit.tsx` + fase di `setup/`, `preopening/`, `opening/`, `reports/` | Tanpa ikon dekoratif di fase baru |
| Skrip uji | `scripts/` | Node 24 (`--experimental-strip-types`) + Chrome headless |

Aturan: **jangan** menambah state global baru di komponen anak. Semua yang
bertahan antar-visit naik ke `App.tsx` dan lewat `usePersistentState`.

---

## 2. Kontrak persistensi (paling sering jadi bug)

1. Semua data yang harus bertahan setelah refresh **wajib** `usePersistentState`,
   bukan `useState`.
2. Kunci storage selalu `siaga_it_v2:<nama>`; jangan menulis localStorage langsung
   kecuali lewat `saveStored` (penanganan kuota + envelope).
3. Titik awal aplikasi adalah **kosong** (`INITIAL_BUILDINGS = []`). Dilarang
   menambahkan fallback `value.length > 0 ? value : SEED` — inilah yang membuat
   aplikasi terasa "demo" karena data muncul lagi setelah dihapus.
4. `handleDeleteBuilding` boleh menghapus **semua** gedung. Setelah kosong,
   `App` menampilkan `OnboardingView`, bukan data contoh.
5. Setiap perubahan besar sebaiknya diikuti `saveNow()` sebelum aksi destruktif
   (cetak, ekspor, tutup tab).
6. Kuota penuh: `saveStored` membuang lampiran base64 besar dan tetap menyimpan
   teks. Jangan mengembalikan `ok: true` tanpa memberi notice ke UI.

Bukti cepat:
```bash
npm run check:storage   # reload, payload rusak, kuota penuh
npm run check:crud      # create -> refresh -> update -> refresh -> delete
npm run check:e2e       # Chrome sungguhan: isi form, refresh, hapus
```

---

## 3. Aturan CRUD

- **Create**: selalu lewat `buildBuildingFromDraft` / `makeRoom` / `makeFacility`,
  supaya penomoran kamar (101, 102, …) dan template QC konsisten.
- **Update**: patch dilakukan dengan spread + `map` berdasarkan `id`, tidak pernah
  mengubah objek di tempat (immutability).
- **Delete**: hapus berdasarkan `id`; setelah menghapus gedung, bersihkan juga
  `issues` milik gedung tersebut dan perbaiki `active_building`.
- ID baru memakai `uid(prefix)` dari `buildingFactory`; jangan memakai index array.

---

## 4. Konvensi TypeScript

- `import type { ... }` untuk tipe (supaya skrip Node bisa menjalankan file yang sama).
- Impor relatif di dalam `scripts/` harus memakai ekstensi `.ts`/`.tsx`
  (`node --experimental-strip-types` tidak menebak ekstensi).
- Tipe status memakai union literal (`'PASS' | 'FAIL' | 'PENDING' | 'NA'`), bukan string bebas.
- Fungsi kecil murni (skor, tanggal, factory) dipisah ke `utils/` atau `shared/`
  agar bisa diuji tanpa React.

---

## 5. Dilarang

- Angka hasil uji karangan (`|| 75`, `|| -55`). Jika tidak diukur, simpan apa adanya.
- Menyimpan seluruh state di satu blob localStorage tanpa envelope versi.
- `window.confirm` berlapis untuk aksi yang bisa dibatalkan (pakai Sheet + tombol jelas).
- Menambah dependency baru untuk hal yang bisa diselesaikan 30 baris kode
  (contoh: uji browser memakai CDP bawaan Chrome, bukan Playwright).
- Menaruh logika bisnis di dalam JSX.

---

## 6. Checklist sebelum selesai

```bash
npm run build        # tsc -b + vite build
npm run lint         # oxlint
npm run check:all    # storage + crud + scoring + render
npm run check:e2e    # bukti persistensi di browser
npm run report:pdf   # laporan A4 (opsional, untuk verifikasi cetak)
```

Yang harus benar: tidak ada error TS, tidak ada data demo, refresh tidak
menghapus isian, dan PDF tetap terbaca hitam-putih.
