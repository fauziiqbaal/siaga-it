# Graph Report - IT Opening  (2026-11-09)

## Corpus Check
- 93 files · ~158,796 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 36 file(s) not represented in the graph (top: .css 17, .xml 10, (none) 4)

## Summary
- 810 nodes · 2033 edges · 40 communities (29 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4b838931`
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
- live-shots.mjs
- package.json
- scripts
- check-crud.ts
- compilerOptions
- dependencies
- e2e-browser.mjs
- report-ssr.tsx
- Building
- compilerOptions
- App.tsx
- ssr-check.tsx
- LiveDashboardView.tsx
- useBackNavigation.ts
- app-shots.tsx
- .oxlintrc.json
- MainActivity.java
- vite
- @capacitor/cli
- tsconfig.json

## God Nodes (most connected - your core abstractions)
1. `Building` - 68 edges
2. `react` - 47 edges
3. `App()` - 38 edges
4. `ColivingIssue` - 35 edges
5. `SimpleUser` - 35 edges
6. `PreOpeningView()` - 32 edges
7. `BuildingSetupView()` - 26 edges
8. `Badge()` - 25 edges
9. `Btn()` - 25 edges
10. `lucide-react` - 25 edges

## Surprising Connections (you probably didn't know these)
- `SampleProperty` --references--> `Building`  [EXTRACTED]
  scripts/fixtures/sample-property.ts → src/types/hotel.ts
- `SampleProperty` --references--> `ColivingIssue`  [EXTRACTED]
  scripts/fixtures/sample-property.ts → src/types/hotel.ts
- `NewBuildingModalProps` --references--> `Building`  [EXTRACTED]
  src/components/building/NewBuildingModal.tsx → src/types/hotel.ts
- `EvidenceExplorerModalProps` --references--> `Building`  [EXTRACTED]
  src/components/common/EvidenceExplorerModal.tsx → src/types/hotel.ts
- `Props` --references--> `Building`  [EXTRACTED]
  src/components/common/SpeedtestSheet.tsx → src/types/hotel.ts

## Import Cycles
- None detected.

## Communities (40 total, 11 thin omitted)

### Community 0 - "PreOpeningView.tsx"
Cohesion: 0.09
Nodes (63): LoginView(), SimpleAuthModal(), AppNav(), AppNavProps, formatSaved(), isMoreActive(), LEGACY_TAB_IDS, MAIN_TABS (+55 more)

### Community 1 - "useServerSync.ts"
Cohesion: 0.16
Nodes (24): ConflictBackups, describeHttpFailure(), fingerprint(), issuesOf(), pruneConflicts(), PullOutcome, PushOutcome, ServerSyncInfo (+16 more)

### Community 2 - "FieldEvaluationView.tsx"
Cohesion: 0.08
Nodes (47): EvidenceCaptureModal(), EvidenceCaptureModalProps, EvidenceExplorerModal(), EvidenceExplorerModalProps, AnnotationItem, AnnotationTool, COLOR_OPTIONS, ImageAnnotationModal() (+39 more)

### Community 3 - "serve.py"
Cohesion: 0.09
Nodes (15): delete_building(), issues_of_building(), merge_evidence(), merge_state(), now_iso(), read_state(), read_wifi_signal(), _rev_of() (+7 more)

### Community 4 - "scoring.ts"
Cohesion: 0.09
Nodes (38): building, empty, emptyOpen, emptyPre, opening, openingWithoutDeviceTakeover, openingWithoutSsid, pre (+30 more)

### Community 5 - "storage.ts"
Cohesion: 0.10
Nodes (26): buildings, fallback, heavy, heavyReloaded, memory, MemoryStorage, quotaResult, reloaded (+18 more)

### Community 6 - "WifiSignalPlugin.java"
Cohesion: 0.10
Nodes (3): ExampleInstrumentedTest, WifiSignalPlugin, ExampleUnitTest

### Community 7 - "PreToolUse"
Cohesion: 0.11
Nodes (11): EXT, files, LIMIT, offenders, ROOT, SKIP_DIRS, STRICT, TARGET_DIRS (+3 more)

### Community 8 - "hotel.ts"
Cohesion: 0.05
Nodes (66): CCTV_STATUS_LABELS, CCTVChecklist(), CCTVChecklistProps, CCTVPointModal(), CCTVPointModalProps, CATEGORY_CONFIG, FloorDeviceInventory(), FloorDeviceInventoryProps (+58 more)

### Community 9 - "check-sync.mjs"
Cohesion: 0.13
Nodes (15): BACKUP, DATA_DIR, DIST, ROOT, DATA_DIR, DIST, healthInfo, ROOT (+7 more)

### Community 10 - "FloorPlanDrawingModal.tsx"
Cohesion: 0.17
Nodes (22): LiveCameraModal(), LiveCameraModalProps, drawArrowElement(), drawCctvElement(), drawLanPortElement(), drawMdfRackElement(), drawRectElement(), drawSelectionBox() (+14 more)

### Community 11 - "live-shots.mjs"
Cohesion: 0.17
Nodes (7): { building, issues }, file, outDir, BACKUP, DATA_DIR, OUT, ROOT

### Community 12 - "package.json"
Cohesion: 0.13
Nodes (21): devDependencies, autoprefixer@^10.6.1, oxlint@^1.81.0, postcss@^8.5.31, tailwindcss@^3.4.19, @types/node@^24.13.3, @types/react@^19.2.18, @types/react-dom@^19.2.7 (+13 more)

### Community 13 - "scripts"
Cohesion: 0.09
Nodes (22): scripts, android:apk, android:open, android:sync, build, check:all, check:crud, check:e2e (+14 more)

### Community 14 - "check-crud.ts"
Cohesion: 0.08
Nodes (27): afterDelete, building, BuildingList, edited, filled, issues, memory, MemoryStorage (+19 more)

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
Cohesion: 0.15
Nodes (11): args, assetsDir, { building, issues }, chrome, chromeCandidates, generatedAt, htmlPath, outDir (+3 more)

### Community 19 - "Building"
Cohesion: 0.10
Nodes (35): LoginViewProps, SimpleAuthModalProps, CalendarDueDateEvent, CalendarEvent, CalendarLiveEvent, CalendarPresaleEvent, CalendarVisitEvent, formatDateKey() (+27 more)

### Community 20 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 21 - "App.tsx"
Cohesion: 0.14
Nodes (20): lucide-react, react, App(), migrateBuildingData(), normalizeUsersList(), SimpleOtpModalProps, BuildingSearchModal(), BuildingSearchModalProps (+12 more)

### Community 22 - "ssr-check.tsx"
Cohesion: 0.11
Nodes (16): react-dom@^19.2.8, react-dom, customBuilding, customHtml, emptyOutput, hasLoginGate, hasOnboarding, html (+8 more)

### Community 23 - "LiveDashboardView.tsx"
Cohesion: 0.23
Nodes (14): formatShortDate(), LiveDashboardView(), formatIndonesianDate(), getBuildingDueDateInfo(), getDaysRemaining(), ITDueDateInfo, MONTH_MAP_ID, MONTH_NAMES_FULL_ID (+6 more)

### Community 24 - "useBackNavigation.ts"
Cohesion: 0.60
Nodes (4): HistoryState, isNavState(), NavSnapshot, useBackNavigation()

### Community 25 - "app-shots.tsx"
Cohesion: 0.17
Nodes (10): assetsDir, { building, issues }, chrome, chromeCandidates, localStorageStub, outDir, projectRoot, SHOTS (+2 more)

### Community 27 - ".oxlintrc.json"
Cohesion: 0.29
Nodes (6): ignorePatterns, plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 29 - "vite"
Cohesion: 0.40
Nodes (4): vite@^8.3.0, @vitejs/plugin-react@^6.1.1, vite, @vitejs/plugin-react

### Community 32 - "@capacitor/cli"
Cohesion: 0.50
Nodes (3): config, @capacitor/cli@^8.6.0, @capacitor/cli

## Knowledge Gaps
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App.tsx` to `PreOpeningView.tsx`, `useServerSync.ts`, `FieldEvaluationView.tsx`, `scoring.ts`, `storage.ts`, `hotel.ts`, `FloorPlanDrawingModal.tsx`, `package.json`, `dependencies`, `report-ssr.tsx`, `Building`, `ssr-check.tsx`, `LiveDashboardView.tsx`, `useBackNavigation.ts`, `app-shots.tsx`?**
  _High betweenness centrality (0.188) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `App()` (e.g. with `app-shots.tsx` and `ssr-check.tsx`) actually correct?**
  _`App()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `PreOpeningView.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09333333333333334 - nodes in this community are weakly interconnected._
- **Why does `Building` connect `Building` to `PreOpeningView.tsx`, `useServerSync.ts`, `FieldEvaluationView.tsx`, `scoring.ts`, `hotel.ts`, `FloorPlanDrawingModal.tsx`, `check-crud.ts`, `App.tsx`, `LiveDashboardView.tsx`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `FieldEvaluationView.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07792207792207792 - nodes in this community are weakly interconnected._
- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `serve.py` be split into smaller, more focused modules?**
  _Cohesion score 0.08897959183673469 - nodes in this community are weakly interconnected._