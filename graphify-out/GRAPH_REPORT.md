# Graph Report - cledgerly-app 2  (2026-08-14)

## Corpus Check
- Large corpus: 1717 files · ~5,120,219 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 957 nodes · 1985 edges · 48 communities (45 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.53)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- API Routes
- Gbrain-Exec.Ts Module
- Browse-Client.Ts Module
- Impeccable-Config.Mjs Module
- Design-Parser.Mjs Module
- API Routes
- Reference Data
- Impeccable-Paths.Mjs Module
- App Routes & Pages
- Gstack-Decision.Ts Module
- Gstack-Memory-Helpers.Ts Module
- Redact-Engine.Ts Module
- Artifact-Schema.Mjs Module
- API Routes
- API Routes
- Page.Tsx Module
- React Hooks
- API Routes
- Layout.Tsx Module
- Worktree.Ts Module
- API Routes
- Package.Json Module
- Page.Tsx Module
- API Routes
- Importmodal.Tsx Module
- Finding Module
- Page.Tsx Module
- Surface-Briefs.Mjs Module
- Amount.Tsx Module
- Progresscard.Tsx Module
- Template-Extensions.Mjs Module
- Page.Tsx Module
- Build.Ts Module
- Staleness-Notice.Mjs Module
- API Routes
- React Hooks
- Redact-Audit-Log.Ts Module
- Reference Data
- Entry.Ts Module
- Is-Generated.Mjs Module
- Target-Args.Mjs Module
- Conductor-Env-Shim.Ts Module
- Gstack-Browser Module
- Is-Conductor.Ts Module
- Open-System-Browser.Mjs Module
- Monthchips.Tsx Module

## God Nodes (most connected - your core abstractions)
1. `catInfo()` - 27 edges
2. `displayMerchant()` - 23 edges
3. `BrowseClient` - 22 edges
4. `LazyBrowseClient` - 22 edges
5. `syncAccount()` - 21 edges
6. `friendlyDate()` - 19 edges
7. `Amount()` - 18 edges
8. `typeInfo()` - 17 edges
9. `scan()` - 15 edges
10. `fmt()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `listGroups()`  [EXTRACTED]
  app/api/transactions/groups/route.ts → lib/repo.ts
- `GET()` --calls--> `accountSummary()`  [EXTRACTED]
  app/api/accounts/[account]/route.ts → lib/repo.ts
- `POST()` --calls--> `applyToMany()`  [EXTRACTED]
  app/api/categorize/route.ts → lib/repo.ts
- `POST()` --calls--> `categorize()`  [EXTRACTED]
  app/api/import/route.ts → lib/categorizer.ts
- `GET()` --calls--> `ruleKey()`  [EXTRACTED]
  app/api/report/annual/route.ts → lib/parser.ts

## Import Cycles
- None detected.

## Communities (48 total, 3 thin omitted)

### Community 0 - "API Routes"
Cohesion: 0.05
Nodes (76): DELETE(), GET(), POST(), runtime, POST(), runtime, DELETE(), GET() (+68 more)

### Community 1 - "Gbrain-Exec.Ts Module"
Cohesion: 0.06
Nodes (62): buildGbrainEnv(), BuildGbrainEnvOptions, execGbrainJson(), execGbrainText(), GbrainConfig, NEEDS_SHELL_ON_WINDOWS, spawnGbrain(), spawnGbrainAsync() (+54 more)

### Community 2 - "Browse-Client.Ts Module"
Cohesion: 0.07
Nodes (9): browse, BrowseClient, BrowseClientError, BrowseClientOptions, defaultStateFile(), LazyBrowseClient, parseIntegerEnvValue(), resolveBrowseAuth() (+1 more)

### Community 3 - "Impeccable-Config.Mjs Module"
Cohesion: 0.10
Nodes (46): applyDetectionConfigSource(), clampByte(), cleanIgnoreValueDisplay(), cloneDetectionConfig(), cloneRawDetectionConfig(), COLOR_CHANNEL_FORMATS, colorIgnoreKey(), DEFAULT_DETECTION_CONFIG (+38 more)

### Community 4 - "Design-Parser.Mjs Module"
Cohesion: 0.13
Nodes (39): assessCoverage(), buildColor(), CANONICAL_SECTIONS, collectBullets(), collectColorValues(), collectParagraphs(), detectFormat(), extractColors() (+31 more)

### Community 5 - "API Routes"
Cohesion: 0.10
Nodes (25): runtime, runtime, runtime, GET(), YearData, GET(), PeriodPicker(), dataDir (+17 more)

### Community 6 - "Reference Data"
Cohesion: 0.10
Nodes (28): COMPOSITION_GRAMMAR_PREFIXES, COMPOSITION_SURFACES, compositionContentHash(), validateCompositionCatalog(), validateCompositionEntry(), CONCEPT_BREADTHS, CONCEPT_STATUSES, CONCEPT_STRENGTHS (+20 more)

### Community 7 - "Impeccable-Paths.Mjs Module"
Cohesion: 0.11
Nodes (25): CRITIQUE_DIR, firstExisting(), getCritiqueDir(), getDesignSidecarCandidates(), getDesignSidecarPath(), getImpeccableDir(), getLegacyLiveConfigPath(), getLegacyLiveServerPath() (+17 more)

### Community 8 - "App Routes & Pages"
Cohesion: 0.14
Nodes (21): CardsPage(), AppHeader(), BrandBadge(), EXTENSIONS, CardStack(), CardVisual(), accountKind(), BRAND_RULES (+13 more)

### Community 9 - "Gstack-Decision.Ts Module"
Cohesion: 0.11
Nodes (21): ActiveDecision, appendEvent(), compact(), CompactResult, computeActive(), DECISION_SCOPES, DECISION_SOURCES, DecisionEvent (+13 more)

### Community 10 - "Gstack-Memory-Helpers.Ts Module"
Cohesion: 0.11
Nodes (25): detectEngineTier(), engineCachePath(), EngineDetect, EngineTier, ERROR_LOG_PATH, ErrorContextEntry, errorLogPath(), extractFrontmatter() (+17 more)

### Community 11 - "Redact-Engine.Ts Module"
Cohesion: 0.12
Nodes (26): applyRedactions(), EMAIL_ALLOW_DOMAINS, EMAIL_ALLOW_LOCALPARTS, emailAllowed(), hasNear(), HTML_ENTITIES, inRanges(), inStructuralToken() (+18 more)

### Community 12 - "Artifact-Schema.Mjs Module"
Cohesion: 0.15
Nodes (24): DESIGN_SIDECAR_SCHEMA_VERSION, PRODUCT_DEPRECATED_SECTIONS, PRODUCT_SCHEMA_VERSION, PRODUCT_V4_SECTIONS, productStampLine(), readProductSchemaVersion(), readSidecarSchemaVersion(), stampProductSchema() (+16 more)

### Community 13 - "API Routes"
Cohesion: 0.14
Nodes (18): GET(), MONTH_NAMES, ParsedQuery, parseQuery(), ReviewPage(), SORT_OPTIONS, sortGroups(), SortId (+10 more)

### Community 14 - "API Routes"
Cohesion: 0.16
Nodes (20): GET(), phantomRows(), POST(), runtime, buildLine(), classify(), extractMerchant(), fmtDate() (+12 more)

### Community 15 - "Page.Tsx Module"
Cohesion: 0.13
Nodes (18): CardDetailPage(), DonutChart(), fmtDonut(), MONTH_SHORT, monthLabel(), monthShort(), PeriodDropdown(), periodToMonth() (+10 more)

### Community 16 - "React Hooks"
Cohesion: 0.17
Nodes (19): checkDesignCoverage(), checkDesignDrift(), checkDetectorIgnores(), checkHookInstallation(), checkLegacyLiveState(), checkWorkspaces(), collectHookCommands(), finding() (+11 more)

### Community 17 - "API Routes"
Cohesion: 0.17
Nodes (16): GET(), GET(), POST(), GET(), runtime, ruleKey(), accountSummary(), bulkConfirm() (+8 more)

### Community 18 - "Layout.Tsx Module"
Cohesion: 0.13
Nodes (13): inter, metadata, PRESETS, SettingsPage(), BottomNav(), ITEMS, NavTabs(), useActive() (+5 more)

### Community 19 - "Worktree.Ts Module"
Cohesion: 0.18
Nodes (9): copyDirSync(), DedupIndex, getDedupPath(), git(), HarvestResult, loadDedupIndex(), saveDedupIndex(), WorktreeInfo (+1 more)

### Community 20 - "API Routes"
Cohesion: 0.18
Nodes (16): GET(), POST(), PUT(), runtime, GET(), POST(), runtime, BUILTIN_RULES (+8 more)

### Community 21 - "Package.Json Module"
Cohesion: 0.11
Nodes (17): dependencies, @excalidraw/excalidraw, @excalidraw/mermaid-to-excalidraw, mermaid, react, react-dom, description, name (+9 more)

### Community 22 - "Page.Tsx Module"
Cohesion: 0.23
Nodes (12): CategoryDetailPage(), CategoryIcon(), PATHS, ALL_CATS, EditModal(), EditResult, SearchResult, SmartPrompt() (+4 more)

### Community 23 - "API Routes"
Cohesion: 0.24
Nodes (15): POST(), parseLines(), commitImport(), getRules(), detectStatementPeriod(), fullDateRange(), iso(), lastDay() (+7 more)

### Community 24 - "Importmodal.Tsx Module"
Cohesion: 0.23
Nodes (11): ImportModal(), INSTITUTIONS, Preview, PreviewLine, Proposal, ProposalModal(), Sheet(), SheetActions() (+3 more)

### Community 25 - "Finding Module"
Cohesion: 0.15
Nodes (9): Finding, Category, PATTERNS, PATTERNS_BY_ID, PLACEHOLDER_STRUCTURAL, PLACEHOLDER_SUBSTRING, RedactPattern, Tier (+1 more)

### Community 26 - "Page.Tsx Module"
Cohesion: 0.19
Nodes (8): ImportsPage(), UnmappedCardsPage(), ICONS, Kind, STYLES, Toast, ToastCtx, useToast()

### Community 27 - "Surface-Briefs.Mjs Module"
Cohesion: 0.36
Nodes (10): getSurfaceBriefDir(), listSurfaceBriefs(), normalizeSurfaceTarget(), parseSurfaceBrief(), resolveSurfaceBrief(), SURFACE_BRIEF_VERSION, surfaceBriefPathForTarget(), writeSurfaceBrief() (+2 more)

### Community 28 - "Amount.Tsx Module"
Cohesion: 0.23
Nodes (4): Amount(), Empty(), SectionTitle(), fmtParts()

### Community 29 - "Progresscard.Tsx Module"
Cohesion: 0.26
Nodes (9): Counts, ProgressCard(), Statement, CONF_META, TxnCard(), fmt(), MONTH_ABBR, STATUS_META (+1 more)

### Community 30 - "Template-Extensions.Mjs Module"
Cohesion: 0.27
Nodes (8): extensionCache, LIVE_TEMPLATE_EXTENSIONS, matchConfiguredExtension(), mergeExtensions(), normalizeExtensionEntries(), readLiveTemplateExtensions(), resolveLiveTemplateExtensions(), safeReadJson()

### Community 31 - "Page.Tsx Module"
Cohesion: 0.24
Nodes (9): AnnualReportPage(), BudgetSuggestion, friendlyDate(), FY_MONTHS, pctChange(), ReportData, RevealSection(), useReveal() (+1 more)

### Community 32 - "Build.Ts Module"
Cohesion: 0.20
Nodes (9): BUILD_INFO, DIST_DIR, DIST_HTML, ENTRY, info, inlineJs, ROOT, sha256 (+1 more)

### Community 33 - "Staleness-Notice.Mjs Module"
Cohesion: 0.39
Nodes (7): cachePath(), filterFreshFindings(), pruneCache(), readCache(), readJson(), stalenessCheckDisabled(), writeCache()

### Community 34 - "API Routes"
Cohesion: 0.39
Nodes (6): PATCH(), GET(), PUT(), getStatements(), getStatusCounts(), updateTransaction()

### Community 35 - "React Hooks"
Cohesion: 0.43
Nodes (4): RevealSection(), SummaryPage(), useReveal(), useCountUp()

### Community 36 - "Redact-Audit-Log.Ts Module"
Cohesion: 0.40
Nodes (3): appendSemanticReview(), securityDir(), SemanticReviewEntry

### Community 37 - "Reference Data"
Cohesion: 0.40
Nodes (5): checkOwnedStagingDir(), isOwnedStagingDir(), STAGING_MARKER, STAGING_PREFIX, StagingVerdict

### Community 38 - "Entry.Ts Module"
Cohesion: 0.40
Nodes (3): done, status, Window

### Community 39 - "Is-Generated.Mjs Module"
Cohesion: 0.60
Nodes (4): hasGeneratedHeader(), HEADER_MARKERS, isGeneratedFile(), isGitIgnored()

### Community 40 - "Target-Args.Mjs Module"
Cohesion: 0.50
Nodes (3): parseTargetOptions(), parseTargetPath(), TargetArgError

### Community 42 - "Conductor-Env-Shim.Ts Module"
Cohesion: 0.67
Nodes (3): promoteConductorEnv(), PROMOTED_KEYS, promotedEnv()

### Community 43 - "Gstack-Browser Module"
Cohesion: 0.50
Nodes (3): gstack-browser script, BROWSE_HEADED, BROWSE_PORT

## Knowledge Gaps
- **190 isolated node(s):** `BrowseClientOptions`, `ResolvedAuth`, `browse`, `PROMOTED_KEYS`, `name` (+185 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `db` connect `API Routes` to `API Routes`, `API Routes`, `API Routes`, `API Routes`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `dbReady` connect `API Routes` to `API Routes`, `API Routes`, `API Routes`, `API Routes`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `useToast()` connect `Page.Tsx Module` to `Layout.Tsx Module`, `API Routes`, `Page.Tsx Module`, `Page.Tsx Module`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `BrowseClientOptions`, `ResolvedAuth`, `browse` to the rest of the system?**
  _190 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `API Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.05207835642618251 - nodes in this community are weakly interconnected._
- **Should `Gbrain-Exec.Ts Module` be split into smaller, more focused modules?**
  _Cohesion score 0.05593561368209256 - nodes in this community are weakly interconnected._
- **Should `Browse-Client.Ts Module` be split into smaller, more focused modules?**
  _Cohesion score 0.06966618287373004 - nodes in this community are weakly interconnected._