# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
npm install && npm run dev
```

This installs dependencies, starts both the server (port 3001) and client (port 5173), and opens the app in your browser.

## Commands

```bash
# Development (starts both server and client, opens browser)
npm run dev

# Server only (port 3001, tsx watch mode, loads server/.env)
npm run dev -w server

# Client only (port 5173, Vite, proxies /api to localhost:3001)
npm run dev -w client

# Build both
npm run build

# Type-check without emitting
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit
```

No test suite or linter is configured yet.

## Architecture

npm workspaces monorepo with two packages: `server` (Express + TypeScript) and `client` (React 18 + Vite + Tailwind + Zustand).

**Purpose:** Scan MySQL schemas for PII columns. Two modes:
1. **Directory mode** — Scan static `.sql` DDL files from `rds-schema-exporter` output directories
2. **Live Database mode** — Connect to live MySQL databases through Teleport tunnels, run `SHOW CREATE TABLE`, and analyze DDL

Both modes produce identical `DatabaseResult[]` output, so the results tree, filters, summary bar, and CSV export work unchanged.

### Server (`server/src/`)

Express on port 3001 with five route groups:

| Route | Purpose |
|-------|---------|
| `POST /api/scan` | Discover table files, parse DDL, detect PII, return grouped results |
| `POST /api/export` | Generate CSV download from scan results |
| `POST /api/validate-path` | Check if directory exists |
| `POST /api/browse` | List subdirectories for folder picker UI |
| `GET /api/teleport/status` | Check if tsh binary is available |
| `GET /api/teleport/clusters` | List clusters from `~/.tsh/*.yaml` |
| `GET /api/teleport/login-status?cluster=X` | Check login status for cluster |
| `POST /api/teleport/login` | Start SSO login (opens browser) |
| `GET /api/teleport/instances?cluster=X` | List MySQL instances on cluster |
| `POST /api/teleport/databases` | Discover databases on instance (temp tunnel) |
| `GET /api/teleport/scan?cluster&instance&databases` | SSE stream of live PII scan results |
| `POST /api/teleport/cancel` | Cancel active SSE scan |
| `POST /api/teleport/shutdown` | Abort scan + clean up all tunnels (sendBeacon target) |
| `GET /api/settings/confluence` | Confluence config status (configured, source, masked fields) |
| `PUT /api/settings/confluence` | Save Confluence config to file |
| `DELETE /api/settings/confluence` | Remove file-based Confluence config |
| `POST /api/settings/confluence/test` | Test Confluence connection with provided credentials, return override count |
| `POST /api/settings/confluence/validate` | Test the currently resolved config (env or file), return override count |

**Service pipeline:** Scanner -> Parser -> PII Detector -> Exporter

- **Scanner** (`services/scanner.ts`) - Recursively walks directories, discovers `.sql` files inside `tables/` folders. Extracts location info (cluster/connection/region/instance/database) from path segments.

- **Parser** (`services/parser.ts`) - Uses `node-sql-parser` to extract column names + data types from CREATE TABLE DDL. Includes regex-based fallback for unparseable DDL.

- **PII Patterns** (`services/pii-patterns.ts`) - ~180 regex patterns organized by confidence tier (critical/high/medium/low) and category (identity/contact/personal/financial/digital/medical/biometric/authentication). Supports `dataTypeRequire`/`dataTypeExclude` constraints to reduce false positives (e.g., TINYINT boolean flags excluded from email/phone patterns).

- **PII Detector** (`services/pii-detector.ts`) - Matches each column against all patterns using suffix-based matching (splits column names by `_` and tests each suffix so `\bemail` catches `support_email`, `\bapi_?key` catches `edm_api_key`, etc.). Also applies table+column overrides. Returns PII columns with confidence tier and category.

- **PII Overrides** (`services/pii-overrides.ts`) - Explicit table+column overrides for columns whose names are too generic to pattern-match globally (e.g. `code`, `short_key`, `entry_code`) but are confirmed PII on specific tables. Uses an O(1) Map lookup keyed by `tablename.columnname`. Override matches get `matchedOn: 'override'`. Also provides `mergeOverrides()` and `getOverridesFromMap()` for combining static and Confluence overrides into a single lookup.

- **Confluence Overrides** (`services/confluence-overrides.ts`) - Dynamically fetches the Confluence PII reference page at scan time via REST API v1 (Basic auth). Parses the HTML table using `cheerio` to extract table+column PII/sensitive entries and converts them to `TableColumnOverride[]`. Falls back gracefully (empty array + warning log) on any failure so scans always complete. Confluence matches get `matchedOn: 'confluence'`.

- **Config Store** (`services/config-store.ts`) - Reads/writes `server/data/config.json` via `fs/promises`. Provides `loadConfig()`, `saveConfig()`, and `clearConfluenceConfig()`. Auto-creates the `data/` directory on first save.

- **Confluence Config Resolution** (`services/confluence-config.ts`) - Single source of truth for Confluence credentials. `resolveConfluenceConfig()` returns config with priority: env vars (all 4 set) > file config (`data/config.json`) > null. Used by both scan routes and live scanner.

- **Exporter** (`services/exporter.ts`) - Flattens scan results tree into CSV rows.

- **Teleport** (`services/teleport.ts`) - Manages Teleport CLI (`tsh`) integration. Ported from `rds-capacity-heatmap` Python project. Functions: `findTsh()` (PATH + macOS app bundle), `getClusters()` (reads `~/.tsh/*.yaml`), `getLoginStatus()` (parses `tsh status --format=json`, checks both active and profiles), `loginToCluster()` (spawns SSO login), `listMysqlInstances()` (filters `tsh db ls` for MySQL protocol), `startTunnel()` (3-step: db login + proxy db + parse port), `stopTunnel()` (terminate + db logout). Includes tunnel registry (`registerTunnel`/`unregisterTunnel`) and `cleanupAll()` for killing all active tunnels on shutdown.

- **Live Scanner** (`services/live-scanner.ts`) - Async generator yielding `LiveScanEvent` for SSE streaming. Opens Teleport tunnel, connects via `mysql2`, runs `SHOW CREATE TABLE` per table, feeds DDL through existing `parseCreateTable()` + `analyzeTable()` pipeline. Supports `AbortSignal` for cancellation. Also provides `discoverDatabases()` for listing schemas on an instance via temp tunnel.

### Client (`client/src/`)

- **State** - Single Zustand store (`store/scan-store.ts`) holds scan mode, scan path, results, filters, Teleport state (clusters, login status, instances, database selection), and streaming state (progress, errors).
- **API client** (`api/client.ts`) - Typed fetch wrappers for all server endpoints including Teleport API functions.
- **Layout** - Dark theme. Left sidebar (w-80): scan mode toggle, then either directory controls (folder input, scan button, progress) or Teleport controls (cluster/login/instance/database picker/scan). Shared: filter bar, export button. Right main area: summary bar + results tree.
- **Results tree** - Three-level hierarchy: database groups -> table groups -> column rows with confidence badges. Identical for both scan modes.

**Hooks:**
- `useScan` — Directory scan lifecycle (path, loading, error, results)
- `useTeleport` — Teleport lifecycle: cluster loading, login polling (2s interval), instance loading, database discovery, SSE scan (EventSource open/message/error/close), cancel. Sends `sendBeacon` to `/api/teleport/shutdown` on `beforeunload` for auto-cleanup on page close.
- `useConfluenceStatus` — Fetches Confluence config status on mount, provides `refresh()` for re-fetching after save/remove

**Scan Components (`components/scan/`):**
- `ScanModeToggle` — Radio-style button group (Directory / Live Database), disables Live if tsh unavailable
- `FolderInput` — Directory path input with browser modal (directory mode)
- `DirectoryBrowser` — Modal file picker for directory selection
- `ScanButton` — Scan trigger button (directory mode)
- `ScanProgress` — Loading spinner + error display (directory mode)
- `TeleportControls` — Cluster dropdown, Login button + status indicator, Instance dropdown, database picker, Scan/Cancel button (live mode)
- `TeleportDatabasePicker` — Checkbox list with Select All/Deselect All, loading spinner, count label
- `LiveScanProgress` — Streaming progress spinner + collapsible errors panel (live mode)

**Settings Components (`components/settings/`):**
- `ConfluenceBanner` — Sidebar status: green "linked" indicator when valid, red warning when connection fails, setup prompt when unconfigured. Validates on page load.
- `ConfluenceSetupModal` — Modal form for Confluence credentials (Page URL, Email, API Token). Test Connection button, Save/Cancel/Remove. Always editable regardless of config source. Shown as scan gate when unconfigured or when validation fails.

### Key Types

- `ConfidenceTier`: `'critical' | 'high' | 'medium' | 'low'`
- `PiiCategory`: 8 categories covering identity, contact, personal, financial, digital, medical, biometric, authentication
- `ScanMode`: `'directory' | 'live'`
- `ScanResponse`: Top-level response with `databases[]` and `summary`
- `DatabaseResult`: Groups tables by location (cluster/connection/region/instance/database)
- `TableResult`: Table with its PII columns
- `PiiColumn`: Column with matches, highest tier, and primary category
- `ConfluenceConfig`: `{ baseUrl, email, apiToken, pageId }` — env-driven config for Confluence API
- `PiiMatch.matchedOn`: `'name' | 'name+type' | 'override' | 'confluence'`
- `ScanResponse.confluenceActive`: optional boolean flag indicating Confluence overrides were used
- `TeleportTunnel`: Running tunnel process with host/port/dbName/dbUser
- `TeleportInstance`: RDS instance metadata from `tsh db ls` (name, uri, accountId, region, instanceId)
- `TeleportStatus`: Login state with loggedIn flag, username, cluster
- `LiveScanEvent`: Union type for SSE events — `progress`, `database_result`, `error`, `done`

Server types in `server/src/types.ts`. Client mirrors in `client/src/api/types.ts`.

### Input Format

**Directory mode:** Expects `rds-schema-exporter` directory tree: `{cluster}/{connection}/{region}/{instance}/{database}/tables/{table}.sql`

**Live mode:** Connects to live MySQL via Teleport tunnel, uses `SHOW CREATE TABLE` for DDL.

### Teleport Integration

Live database scanning via Teleport tunnels. Requires `tsh` binary (Teleport CLI or Teleport Connect app).

**How it works:**
1. Client selects cluster from `~/.tsh/*.yaml` profiles
2. SSO login via `tsh login <cluster>` (opens browser)
3. Poll `tsh status --format=json` until logged in (checks both `active` and `profiles[]`)
4. List MySQL instances via `tsh db ls --proxy=<cluster> --format=json`
5. Discover databases: open temp tunnel -> query `information_schema.SCHEMATA` -> close tunnel
6. Scan: open tunnel -> connect `mysql2` -> `SHOW CREATE TABLE` per table -> existing DDL parser + analyzer
7. Results streamed via SSE (Server-Sent Events) per database
8. Cleanup: close MySQL connection, terminate tunnel process, `tsh db logout`

**Key implementation details:**
- `tsh status` returns exit code 1 even when logged in — never use `check=true`
- Uses `--proxy=<cluster>` flag (not `--cluster=`) for non-active profiles
- Port allocation: `--port 0` lets tsh pick a random port, parsed from stdout via regex `127.0.0.1:(\d+)`
- SSO email from `tsh status` is used as `--db-user` automatically
- **Auto-cleanup:** All tunnels are tracked in a registry. On page close, client sends `sendBeacon('/api/teleport/shutdown')` to abort scans and kill tunnels. Server also handles `SIGINT`/`SIGTERM` via `cleanupAll()`.

### Confluence Integration

Optional live override integration with Confluence PII reference page. When configured, the scan fetches the Confluence page and merges its entries with static overrides.

**Setup (two options):**
1. **UI (recommended):** Click "Edit" on the Confluence banner (or triggered on first scan), enter page URL + email + API token, test, and save. Config is persisted to `server/data/config.json`. UI-saved config overrides `.env` values.
2. **Env vars (fallback):** Copy `server/.env.example` to `server/.env` and fill in credentials. Only used if no UI-saved config exists:
```
CONFLUENCE_BASE_URL=https://your-org.atlassian.net
CONFLUENCE_EMAIL=your-email@company.com
CONFLUENCE_API_TOKEN=your-api-token
CONFLUENCE_PAGE_ID=123456789
```

**Config resolution priority:** file config (`server/data/config.json`) > env vars (all 4 set) > null (scan without Confluence)

**How it works:**
- At scan time, `resolveConfluenceConfig()` determines which config source to use
- The server fetches the Confluence page HTML via REST API v1
- The HTML table is parsed with `cheerio` — rows with IsPII=Y get tier `high`, rows with only Sensitive Data=Y get tier `medium`
- Confluence overrides are merged with static `TABLE_COLUMN_OVERRIDES` (both kept, no dedup)
- The merged override map is passed to `analyzeTable()` for each file
- Response includes `confluenceActive: true` when Confluence overrides were successfully loaded
- If Confluence fetch fails (bad creds, network, etc.), scan proceeds with static overrides only
