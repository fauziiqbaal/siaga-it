# PROJECT-MAP — peta orientasi singkat (baca ini dulu, bukan seluruh repo)

Dokumen ini pengganti "memory bank" berat: cukup ~90 baris untuk membuat agent paham struktur
tanpa menjelajah 57 file / ~28.9k baris di `src/`. Update manual kalau ada modul baru.

## 1. Stack & runtime
- React 19 + TypeScript, Vite 8, Tailwind 3 (tema Zinc 950), Lucide, framer-motion, Capacitor 8 (Android APK).
- `npm run dev` → http://localhost:5174 (`/api` diproxy ke 8790). `python serve.py` → web + API JSON (port 5173).
- Offline-first: `localStorage` + IndexedDB; server JSON opsional (last-write-wins).

## 2. Titik masuk & alur
- `src/main.tsx` → `src/App.tsx` (923 baris, router tab + state global gedung aktif).
- Onboarding tanpa data → `src/components/setup/OnboardingView.tsx` (`INITIAL_BUILDINGS = []`).
- Fase: `setup/BuildingSetupView` → `preopening/PreOpeningView` + `evaluation/FieldEvaluationView`
  → `opening/OpeningView` → skor: `utils/scoring.ts` (+ `utils/readinessCalculator.ts`).
- Laporan A4 tunggal: `components/reports/PrintableReport.tsx` + `reports/ScoreReportView.tsx`.

## 3. Inti yang sering disentuh (baca bagian ini, bukan file 2000+ baris)
| Area | File | Catatan |
| --- | --- | --- |
| Persistensi | `hooks/usePersistentState.ts`, `lib/storage.ts` | envelope `{v,savedAt,data}`, debounce 250ms, `checkStorage()` |
| Sinkron server | `hooks/useServerSync.ts`, `lib/serverSync.ts` | snapshot utuh saja, jangan kosongkan server |
| Navigasi back HP | `hooks/useBackNavigation.ts`, `components/ui/kit.tsx` (`Sheet`) | back tidak boleh keluar app |
| Tipe domain | `types/hotel.ts` | Building/Floor/Room/CCTV/Device/Billing/Issue |
| Bukti foto | `utils/evidenceStorage.ts` (IndexedDB) | fallback localStorage |
| Wi-Fi dBm | `lib/wifiSignal.ts` | hanya manual input atau plugin native `WifiSignal` |
| Speedtest nyata | `components/common/SpeedtestSheet.tsx` | ukur byte asli, bukan simulasi |
| Floor plan canvas | `property/floorPlanTypes.ts` (71) + `property/floorPlanDraw.ts` (682) | tipe + `STATUS_THEMES` + 10 fungsi `draw*Element(ctx, el)`; modal tinggal 2067 baris |
| Data contoh (skrip saja) | `data/mockData.ts` (`SAMPLE_BUILDINGS`), `scripts/fixtures/*` | dilarang auto-seed |
| Plugin native | `android/app/src/main/java/co/rukita/siagait/WifiSignalPlugin.java` | jangan di-ignore |

## 4. Peta direktori `src/` (cukup nama, tidak perlu dibuka semua)
- `components/`: `auth/` (SimpleAuth,SimpleOtp), `building/` (New/Delete/Search modal),
  `calendar/OpeningCalendarView` (1106), `cctv/` (Checklist 838, PointModal), `common/` (Evidence*,
  ImageAnnotation 759, LiveCamera, Speedtest, WifiSpeedtest), `dashboard/LiveDashboardView`,
  `devices/FloorDeviceInventory` (1248), `evaluation/` (FieldEvaluationView 2221, IssueActionModal,
  EvidenceHistory, ItemInspect), `issues/` (ResolveIssueModal 867, SimpleIssueTracker),
  `layout/AppNav`, `opening/OpeningView`, `preopening/PreOpeningView` (848),
  `property/` (PropertyManagement 2326, FloorPlanDrawingModal 2522), `readiness/LiveReadinessReport` (1746),
  `reports/`, `setup/` (BuildingSetupView 664, OnboardingView), `shared/` (BillingEditor,
  buildingFactory, FacilityMarks), `ui/kit.tsx`, `users/UserManagementView` (1181).
- `hooks/`, `lib/`, `types/`, `utils/`, `data/` — lihat tabel bagian 3.
- `scripts/`: `check-storage|crud|scoring.ts` (node --experimental-strip-types),
  `ssr-check.tsx`, `app-shots.tsx`, `report-ssr.tsx`, `e2e-browser.mjs`, `check-sync.mjs`,
  `check-native.mjs`, `live-shots.mjs`, `fixtures/` (+ `lib/browser.mjs`).

## 5. Kunci localStorage
`siaga_it_v2:buildings`, `siaga_it_v2:issues`, `siaga_it_v2:active_building`,
`siaga_it_v2:active_tab`, `siaga_it_v2:theme_dark`, `siaga_it_users`.

## 6. Verifikasi hemat token (urut dari termurah)
```powershell
npm run ctx:audit                # ukuran file src/ + scripts/ (termurah, tanpa build)
npm run check:scoring            # 1 file, tanpa browser
npm run check:storage            # kontrak persistensi
npm run check:crud               # CRUD gedung/lantai/kamar
npm run check:render             # SSR render (kalau menyentuh UI)
npm run check:e2e                # Chrome headless (paling mahal)
npm run build                    # typecheck terakhir, output disaring "error"
```
Aturan tetap: `.clineignore` (root) + `.clinerules/token-budget.md`.

Penegak `.clineignore` sudah terpasang: `.clinerules/hooks/PreToolUse` (Node, tanpa jq/git).
Aktifkan **Enable Hooks** di feature settings Cline; uji logikanya dengan
`node .clinerules/hooks/PreToolUse --self-test` (14 kasus). Hook fail-open: error apa pun → tool call dibiarkan.

## 7. Jebakan yang mahal kalau salah
- Menambah seed/fallback demo (`value.length > 0 ? value : SEED`) → dilarang (AGENTS.md).
- Menyimpan state QC di `useState` biasa → data hilang saat refresh.
- `<header>` di `PrintableReport` → hilang saat cetak (CSS print global menyembunyikan).
- Ikon dekoratif di UI fase baru / target sentuh < 38px.
- Konversi persen sinyal → dBm (harus dari sensor/manual).
