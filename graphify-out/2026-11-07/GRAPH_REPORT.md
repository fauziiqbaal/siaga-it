# Graph Report - IT Opening  (2026-11-07)

## Corpus Check
- 93 files · ~155,899 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 35 file(s) not represented in the graph (top: .css 16, .xml 10, (none) 4)

## Summary
- 798 nodes · 1982 edges · 45 communities (33 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7d3d4380`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- PreOpeningView.tsx
- useServerSync.ts
- FieldEvaluationView.tsx
- serve.py
- scoring.ts
- storage.ts
- WifiSignalPlugin.java
- PreToolUse
- hotel.ts
- check-sync.mjs
- FloorPlanDrawingModal.tsx
- Building
- package.json
- scripts
- check-crud.ts
- compilerOptions
- dependencies
- e2e-browser.mjs
- report-ssr.tsx
- LiveDashboardView.tsx
- compilerOptions
- ColivingIssue
- App.tsx
- ssr-check.tsx
- check-storage.ts
- app-shots.tsx
- check-native.mjs
- .oxlintrc.json
- MainActivity.java
- vite
- CCTVChecklist.tsx
- @capacitor/cli
- tsconfig.json
- FloorDeviceInventory.tsx
- react-dom
- SaveStatus

## God Nodes (most connected - your core abstractions)
1. `Building` - 68 edges
2. `react` - 47 edges
3. `App()` - 36 edges
4. `ColivingIssue` - 35 edges
5. `SimpleUser` - 33 edges
6. `PreOpeningView()` - 31 edges
7. `BuildingSetupView()` - 26 edges
8. `Badge()` - 25 edges
9. `Btn()` - 25 edges
10. `lucide-react` - 25 edges

## Surprising Connections (you probably didn't know these)
- `SampleProperty` --references--> `Building`  [EXTRACTED]
  scripts/fixtures/sample-property.ts → src/types/hotel.ts
- `SampleProperty` --references--> `ColivingIssue`  [EXTRACTED]
  scripts/fixtures/sample-property.ts → src/types/hotel.ts
- `createFilledProperty()` --calls--> `buildBuildingFromDraft()`  [EXTRACTED]
  scripts/fixtures/sample-property.ts → src/components/shared/buildingFactory.ts
- `Props` --references--> `Building`  [EXTRACTED]
  src/components/common/SpeedtestSheet.tsx → src/types/hotel.ts
- `NewBuildingModalProps` --references--> `Building`  [EXTRACTED]
  src/components/building/NewBuildingModal.tsx → src/types/hotel.ts

## Import Cycles
- None detected.

## Communities (45 total, 12 thin omitted)

### Community 0 - "PreOpeningView.tsx"
Cohesion: 0.07
Nodes (85): LoginView(), SimpleAuthModal(), measureDownload(), measurePing(), measureUpload(), Phase, Props, SpeedtestSheet() (+77 more)

### Community 1 - "useServerSync.ts"
Cohesion: 0.16
Nodes (24): Args, ConflictBackups, describeHttpFailure(), fingerprint(), issuesOf(), pruneConflicts(), PullOutcome, PushOutcome (+16 more)

### Community 2 - "FieldEvaluationView.tsx"
Cohesion: 0.07
Nodes (58): lucide-react, react, SimpleOtpModalProps, EvidenceCaptureModal(), EvidenceCaptureModalProps, EvidenceExplorerModal(), AnnotationItem, AnnotationTool (+50 more)

### Community 3 - "serve.py"
Cohesion: 0.09
Nodes (13): delete_building(), issues_of_building(), merge_state(), now_iso(), read_state(), read_wifi_signal(), _rev_of(), _run() (+5 more)

### Community 4 - "scoring.ts"
Cohesion: 0.09
Nodes (32): building, empty, emptyOpen, emptyPre, opening, openingWithoutDeviceTakeover, openingWithoutSsid, pre (+24 more)

### Community 5 - "storage.ts"
Cohesion: 0.16
Nodes (24): App(), HistoryState, isNavState(), NavSnapshot, useBackNavigation(), Options, PersistentState, usePersistentState() (+16 more)

### Community 6 - "WifiSignalPlugin.java"
Cohesion: 0.10
Nodes (3): ExampleInstrumentedTest, WifiSignalPlugin, ExampleUnitTest

### Community 7 - "PreToolUse"
Cohesion: 0.11
Nodes (11): EXT, files, LIMIT, offenders, ROOT, SKIP_DIRS, STRICT, TARGET_DIRS (+3 more)

### Community 8 - "hotel.ts"
Cohesion: 0.13
Nodes (18): PropertyManagementProps, Props, AppModuleDefinition, ASSET_CONDITION_LABELS, BillingTakeoverStatus, CHECK_STATUS_LABELS, FacilityType, HandoverSignOff (+10 more)

### Community 9 - "check-sync.mjs"
Cohesion: 0.13
Nodes (15): DATA_DIR, DIST, healthInfo, ROOT, wifi, CHROME_CANDIDATES, findChrome(), MIME (+7 more)

### Community 10 - "FloorPlanDrawingModal.tsx"
Cohesion: 0.19
Nodes (21): drawArrowElement(), drawCctvElement(), drawLanPortElement(), drawMdfRackElement(), drawRectElement(), drawSelectionBox(), drawSmartlockElement(), drawTextElement() (+13 more)

### Community 11 - "Building"
Cohesion: 0.14
Nodes (18): BuildingSearchModal(), BuildingSearchModalProps, DeleteBuildingModal(), DeleteBuildingModalProps, CalendarDueDateEvent, CalendarEvent, CalendarLiveEvent, CalendarPresaleEvent (+10 more)

### Community 12 - "package.json"
Cohesion: 0.13
Nodes (21): devDependencies, autoprefixer@^10.6.1, oxlint@^1.81.0, postcss@^8.5.31, tailwindcss@^3.4.19, @types/node@^24.13.3, @types/react@^19.2.18, @types/react-dom@^19.2.7 (+13 more)

### Community 13 - "scripts"
Cohesion: 0.09
Nodes (22): scripts, android:apk, android:open, android:sync, build, check:all, check:crud, check:e2e (+14 more)

### Community 14 - "check-crud.ts"
Cohesion: 0.10
Nodes (13): afterDelete, building, BuildingList, edited, filled, issues, memory, MemoryStorage (+5 more)

### Community 15 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 16 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, canvas-confetti@^1.9.4, @capacitor/android@^8.6.0, @capacitor/core@^8.6.0, clsx@^2.1.1, framer-motion@^14.3.0, lucide-react@^1.59.0, react@^19.2.8 (+9 more)

### Community 17 - "e2e-browser.mjs"
Cohesion: 0.13
Nodes (16): bodyText(), chrome, chromeCandidates, chromePath, DIST, evaluate(), MIME, pending (+8 more)

### Community 18 - "report-ssr.tsx"
Cohesion: 0.12
Nodes (15): createFilledProperty(), createSampleIssues(), DOWNLOAD_SPEEDS, SampleProperty, args, assetsDir, { building, issues }, chrome (+7 more)

### Community 19 - "LiveDashboardView.tsx"
Cohesion: 0.19
Nodes (16): NewBuildingModal(), NewBuildingModalProps, formatShortDate(), LiveDashboardView(), formatIndonesianDate(), getBuildingDueDateInfo(), getDaysRemaining(), ITDueDateInfo (+8 more)

### Community 20 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 21 - "ColivingIssue"
Cohesion: 0.14
Nodes (19): LoginViewProps, SimpleAuthModalProps, LiveDashboardViewProps, ResolveIssueModalProps, SimpleIssueTrackerProps, Props, Props, LiveReadinessReport() (+11 more)

### Community 22 - "App.tsx"
Cohesion: 0.19
Nodes (15): migrateBuildingData(), normalizeUsersList(), FieldEvaluationViewProps, APP_MODULES, APP_USERS, getDefaultPermissionsForRole(), INITIAL_BUILDINGS, INITIAL_ISSUES (+7 more)

### Community 23 - "ssr-check.tsx"
Cohesion: 0.12
Nodes (14): customBuilding, customHtml, emptyOutput, hasLoginGate, hasOnboarding, html, legacyTabs, localStorageStub (+6 more)

### Community 24 - "check-storage.ts"
Cohesion: 0.13
Nodes (8): buildings, fallback, heavy, heavyReloaded, memory, MemoryStorage, quotaResult, reloaded

### Community 25 - "app-shots.tsx"
Cohesion: 0.17
Nodes (10): assetsDir, { building, issues }, chrome, chromeCandidates, localStorageStub, outDir, projectRoot, SHOTS (+2 more)

### Community 26 - "check-native.mjs"
Cohesion: 0.18
Nodes (7): BACKUP, DATA_DIR, DIST, ROOT, { building, issues }, file, outDir

### Community 27 - ".oxlintrc.json"
Cohesion: 0.29
Nodes (6): ignorePatterns, plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 29 - "vite"
Cohesion: 0.40
Nodes (4): vite@^8.3.0, @vitejs/plugin-react@^6.1.1, vite, @vitejs/plugin-react

### Community 30 - "CCTVChecklist.tsx"
Cohesion: 0.35
Nodes (10): CCTV_STATUS_LABELS, CCTVChecklist(), CCTVChecklistProps, CCTVPointModal(), CCTVPointModalProps, CCTV_CONNECTIVITY_CONFIG, CCTVConnectivityType, CCTVOperationalStatus (+2 more)

### Community 32 - "@capacitor/cli"
Cohesion: 0.50
Nodes (3): config, @capacitor/cli@^8.6.0, @capacitor/cli

### Community 42 - "FloorDeviceInventory.tsx"
Cohesion: 0.25
Nodes (10): CATEGORY_CONFIG, FloorDeviceInventory(), FloorDeviceInventoryProps, isWifiCategoryDevice(), normalizeCategory(), ASSET_CATEGORIES, DeviceCategory, ITDevice (+2 more)

### Community 44 - "SaveStatus"
Cohesion: 0.50
Nodes (4): AppNavProps, Props, SaveStatus, StorageHealth

## Knowledge Gaps
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `FieldEvaluationView.tsx` to `PreOpeningView.tsx`, `useServerSync.ts`, `scoring.ts`, `storage.ts`, `hotel.ts`, `FloorDeviceInventory.tsx`, `Building`, `package.json`, `FloorPlanDrawingModal.tsx`, `react-dom`, `dependencies`, `report-ssr.tsx`, `LiveDashboardView.tsx`, `ColivingIssue`, `App.tsx`, `ssr-check.tsx`, `app-shots.tsx`, `CCTVChecklist.tsx`?**
  _High betweenness centrality (0.192) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `App()` (e.g. with `app-shots.tsx` and `ssr-check.tsx`) actually correct?**
  _`App()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `PreOpeningView.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06853226727584237 - nodes in this community are weakly interconnected._
- **Why does `Building` connect `Building` to `PreOpeningView.tsx`, `useServerSync.ts`, `FieldEvaluationView.tsx`, `scoring.ts`, `hotel.ts`, `FloorDeviceInventory.tsx`, `FloorPlanDrawingModal.tsx`, `SaveStatus`, `report-ssr.tsx`, `LiveDashboardView.tsx`, `ColivingIssue`, `App.tsx`, `CCTVChecklist.tsx`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Should `FieldEvaluationView.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0715962441314554 - nodes in this community are weakly interconnected._
- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `serve.py` be split into smaller, more focused modules?**
  _Cohesion score 0.08888888888888889 - nodes in this community are weakly interconnected._