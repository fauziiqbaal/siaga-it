# Token Budget — aturan kerja hemat konteks (proyek Siaga IT)

Target: satu task selesai dengan konteks sekecil mungkin, tanpa mengorbankan verifikasi.

## 1. Membaca file
- Orientasi dulu lewat `docs/PROJECT-MAP.md`. Jangan `grep`/`ls -R` seluruh repo hanya untuk mencari lokasi.
- File besar **jangan** dibaca utuh (baris, hasil `npm run ctx:audit`):
  `PropertyManagement` 2485, `FieldEvaluationView` 2359, `FloorPlanDrawingModal` 2067,
  `LiveReadinessReport` 1879, `mockData.ts` 1460, `FloorDeviceInventory` 1343,
  `UserManagementView` 1258, `OpeningCalendarView` 1210, `App.tsx` 1005, `floorPlanDraw.ts` 682.
  Ambil potongan: `read_files` dengan `start_line`/`end_line`, atau
  `Select-String -Path <file> -Pattern '<regex>' -Context 3,3`.
- Satu file dibaca sekali per task; jangan baca ulang selama isinya masih ada di riwayat.
- Dilarang membuka: `node_modules`, `dist`, `reports`, `data/`, `.ssr-check`, `.shots-build`,
  `android/**/build` (sudah ada di `.clineignore`).

## 2. Menjalankan perintah
- Selalu saring output: `2>&1 | Select-String -Pattern "error|Error|FAIL|✗"` atau `Select-Object -First 40`.
  Jangan pernah dump log `npm run build` / `vite` penuh.
- Verifikasi termurah lebih dulu: `npm run check:scoring` / `check:storage` / `check:crud`;
  `check:render` atau `check:e2e` hanya jika menyentuh UI/render; `npm run build` sekali di akhir.
- Perintah independen digabung dalam satu tool call, bukan satu per satu.

## 3. Menulis kode & jawaban
- Edit bertarget dengan `editor` + `old_text` minimal yang unik. Tulis ulang file penuh hanya
  untuk file < 80 baris.
- Bahasa Indonesia, ringkas. Tanpa basa-basi, tanpa mengulang isi file/diff di jawaban,
  tanpa penjelasan teori yang tidak diminta.
- Akhiri dengan maksimal 5 baris: file yang berubah, perintah verifikasi + hasil, catatan risiko.
- Jangan membuat README/dokumen baru kecuali diminta; jangan menambah dependency baru
  kecuali benar-benar diperlukan (stack tetap: React 19 + TS + Tailwind + Lucide).

## 4. Konteks & model
- Sudah ~60% konteks terpakai → `/smol` (ringkas riwayat), lalu lanjut task yang sama.
- Satu milestone selesai → `/newtask` daripada meneruskan satu task raksasa.
- Tugas cari/ringkas/verifikasi → model murah; debugging logika skor/persistensi/arsitektur → model kuat.
- Jangan mengubah `AGENTS.md` / `.clinerules/**` / daftar skill atau MCP di tengah task:
  setiap perubahan prefix instruksi membatalkan cache prompt sehingga seluruh konteks ditagih ulang.
