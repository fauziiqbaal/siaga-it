# Graph Report - IT Opening  (2026-11-07)

## Corpus Check
- 92 files · ~154,819 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 32 file(s) not represented in the graph (top: .css 13, .xml 10, (none) 4)

## Summary
- 791 nodes · 1947 edges · 41 communities (30 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3353f0b5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- PreOpeningView.tsx
- Building
- FieldEvaluationView.tsx
- serve.py
- check-scoring.ts
- storage.ts
- WifiSignalPlugin.java
- PreToolUse
- hotel.ts
- check-sync.mjs
- FloorPlanDrawingModal.tsx
- App.tsx
- package.json
- scripts
- check-crud.ts
- compilerOptions
- dependencies
- e2e-browser.mjs
- report-ssr.tsx
- LiveDashboardView.tsx
- compilerOptions
- check-storage.ts
- ssr-check.tsx
- wifiSignal.ts
- app-shots.tsx
- live-shots.mjs
- .oxlintrc.json
- MainActivity.java
- vite
- useBackNavigation.ts
- @capacitor/cli
- tsconfig.json

## God Nodes (most connected - your core abstractions)
1. `Building` - 68 edges
2. `react` - 46 edges
3. `ColivingIssue` - 35 edges
4. `App()` - 35 edges
5. `PreOpeningView()` - 31 edges
6. `SimpleUser` - 29 edges
7. `BuildingSetupView()` - 26 edges
8. `lucide-react` - 25 edges
9. `Badge()` - 23 edges
10. `Btn()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `SampleProperty` --references--> `Building`  [EXTRACTED]
  scripts/fixtures/sample-property.ts → src/types/hotel.ts
- `SampleProperty` --references--> `ColivingIssue`  [EXTRACTED]
  scripts/fixtures/sample-property.ts → src/types/hotel.ts
- `Props` --references--> `Building`  [EXTRACTED]
  src/components/common/SpeedtestSheet.tsx → src/types/hotel.ts
- `NewBuildingModalProps` --references--> `Building`  [EXTRACTED]
  src/components/building/NewBuildingModal.tsx → src/types/hotel.ts
- `createFilledProperty()` --calls--> `buildBuildingFromDraft()`  [EXTRACTED]
  scripts/fixtures/sample-property.ts → src/components/shared/buildingFactory.ts

## Import Cycles
- None detected.

## Communities (41 total, 11 thin omitted)

### Community 0 - "PreOpeningView.tsx"
Cohesion: 0.07
Nodes (86): SimpleAuthModal(), measureDownload(), measurePing(), measureUpload(), Phase, Props, SpeedtestSavePayload, SpeedtestSheet() (+78 more)

### Community 1 - "Building"
Cohesion: 0.06
Nodes (62): SimpleAuthModalProps, BuildingSearchModal(), BuildingSearchModalProps, DeleteBuildingModal(), DeleteBuildingModalProps, CalendarDueDateEvent, CalendarEvent, CalendarLiveEvent (+54 more)

### Community 2 - "FieldEvaluationView.tsx"
Cohesion: 0.07
Nodes (56): lucide-react, react, SimpleOtpModalProps, EvidenceCaptureModal(), EvidenceCaptureModalProps, EvidenceExplorerModal(), AnnotationItem, AnnotationTool (+48 more)

### Community 3 - "serve.py"
Cohesion: 0.09
Nodes (13): delete_building(), issues_of_building(), merge_state(), now_iso(), read_state(), read_wifi_signal(), _rev_of(), _run() (+5 more)

### Community 4 - "check-scoring.ts"
Cohesion: 0.15
Nodes (9): building, empty, emptyOpen, emptyPre, opening, openingWithoutDeviceTakeover, openingWithoutSsid, pre (+1 more)

### Community 5 - "storage.ts"
Cohesion: 0.17
Nodes (23): App(), Props, Options, PersistentState, SaveStatus, usePersistentState(), APP_DATA_VERSION, checkStorage() (+15 more)

### Community 6 - "WifiSignalPlugin.java"
Cohesion: 0.10
Nodes (3): ExampleInstrumentedTest, WifiSignalPlugin, ExampleUnitTest

### Community 7 - "PreToolUse"
Cohesion: 0.11
Nodes (11): EXT, files, LIMIT, offenders, ROOT, SKIP_DIRS, STRICT, TARGET_DIRS (+3 more)

### Community 8 - "hotel.ts"
Cohesion: 0.07
Nodes (45): CCTV_STATUS_LABELS, CCTVChecklist(), CCTVChecklistProps, CCTVPointModal(), CCTVPointModalProps, CATEGORY_CONFIG, FloorDeviceInventory(), FloorDeviceInventoryProps (+37 more)

### Community 9 - "check-sync.mjs"
Cohesion: 0.13
Nodes (15): BACKUP, DATA_DIR, DIST, ROOT, DATA_DIR, DIST, healthInfo, ROOT (+7 more)

### Community 10 - "FloorPlanDrawingModal.tsx"
Cohesion: 0.21
Nodes (19): drawArrowElement(), drawCctvElement(), drawLanPortElement(), drawMdfRackElement(), drawRectElement(), drawSelectionBox(), drawSmartlockElement(), drawTextElement() (+11 more)

### Community 11 - "App.tsx"
Cohesion: 0.16
Nodes (14): migrateBuildingData(), normalizeUsersList(), FloorPlanDrawingModalProps, APP_MODULES, APP_USERS, getDefaultPermissionsForRole(), INITIAL_BUILDINGS, INITIAL_ISSUES (+6 more)

### Community 12 - "package.json"
Cohesion: 0.13
Nodes (21): devDependencies, autoprefixer@^10.6.1, oxlint@^1.81.0, postcss@^8.5.31, tailwindcss@^3.4.19, @types/node@^24.13.3, @types/react@^19.2.18, @types/react-dom@^19.2.7 (+13 more)

### Community 13 - "scripts"
Cohesion: 0.09
Nodes (22): scripts, android:apk, android:open, android:sync, build, check:all, check:crud, check:e2e (+14 more)

### Community 14 - "check-crud.ts"
Cohesion: 0.07
Nodes (30): afterDelete, building, BuildingList, edited, filled, issues, memory, MemoryStorage (+22 more)

### Community 15 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 16 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, canvas-confetti@^1.9.4, @capacitor/android@^8.6.0, @capacitor/core@^8.6.0, clsx@^2.1.1, framer-motion@^14.3.0, lucide-react@^1.59.0, react@^19.2.8 (+9 more)

### Community 17 - "e2e-browser.mjs"
Cohesion: 0.14
Nodes (16): bodyText(), chrome, chromeCandidates, chromePath, DIST, evaluate(), MIME, pending (+8 more)

### Community 18 - "report-ssr.tsx"
Cohesion: 0.14
Nodes (13): react-dom@^19.2.8, react-dom, args, assetsDir, { building, issues }, chrome, chromeCandidates, generatedAt (+5 more)

### Community 19 - "LiveDashboardView.tsx"
Cohesion: 0.19
Nodes (16): NewBuildingModal(), NewBuildingModalProps, formatShortDate(), LiveDashboardView(), formatIndonesianDate(), getBuildingDueDateInfo(), getDaysRemaining(), ITDueDateInfo (+8 more)

### Community 20 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 21 - "check-storage.ts"
Cohesion: 0.13
Nodes (8): buildings, fallback, heavy, heavyReloaded, memory, MemoryStorage, quotaResult, reloaded

### Community 22 - "ssr-check.tsx"
Cohesion: 0.14
Nodes (12): customBuilding, customHtml, emptyOutput, hasOnboarding, html, legacyTabs, localStorageStub, onboarding (+4 more)

### Community 23 - "wifiSignal.ts"
Cohesion: 0.43
Nodes (6): capacitor(), CapacitorGlobal, isNativeApp(), NativeWifiReading, readNativeWifiSignal(), WifiSignalPlugin

### Community 25 - "app-shots.tsx"
Cohesion: 0.15
Nodes (10): assetsDir, { building, issues }, chrome, chromeCandidates, localStorageStub, outDir, projectRoot, SHOTS (+2 more)

### Community 26 - "live-shots.mjs"
Cohesion: 0.22
Nodes (4): BACKUP, DATA_DIR, OUT, ROOT

### Community 27 - ".oxlintrc.json"
Cohesion: 0.29
Nodes (6): ignorePatterns, plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 29 - "vite"
Cohesion: 0.40
Nodes (4): vite@^8.3.0, @vitejs/plugin-react@^6.1.1, vite, @vitejs/plugin-react

### Community 30 - "useBackNavigation.ts"
Cohesion: 0.60
Nodes (4): HistoryState, isNavState(), NavSnapshot, useBackNavigation()

### Community 32 - "@capacitor/cli"
Cohesion: 0.50
Nodes (3): config, @capacitor/cli@^8.6.0, @capacitor/cli

## Knowledge Gaps
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `FieldEvaluationView.tsx` to `PreOpeningView.tsx`, `Building`, `storage.ts`, `hotel.ts`, `FloorPlanDrawingModal.tsx`, `App.tsx`, `package.json`, `dependencies`, `report-ssr.tsx`, `LiveDashboardView.tsx`, `ssr-check.tsx`, `app-shots.tsx`, `useBackNavigation.ts`?**
  _High betweenness centrality (0.193) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `App()` (e.g. with `app-shots.tsx` and `ssr-check.tsx`) actually correct?**
  _`App()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `PreOpeningView.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06834189986674281 - nodes in this community are weakly interconnected._
- **Why does `Building` connect `Building` to `PreOpeningView.tsx`, `FieldEvaluationView.tsx`, `storage.ts`, `hotel.ts`, `FloorPlanDrawingModal.tsx`, `App.tsx`, `check-crud.ts`, `LiveDashboardView.tsx`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Should `Building` be split into smaller, more focused modules?**
  _Cohesion score 0.06189640035118525 - nodes in this community are weakly interconnected._
- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `FieldEvaluationView.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07329192546583851 - nodes in this community are weakly interconnected._