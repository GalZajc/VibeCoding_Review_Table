# Storage and compatibility

New projects receive `review/` (page, style, model, prompt generator and feature catalog), `scripts/review-server.cjs`, and `review.config.json`. Human data lives in `DATA/review.json` and `DATA/review-screenshots/`; `DATA/review-next-prompt.md` is derived. `DATA/review-server.json` records URL/root/PID, not a permanent port promise. Keep DATA private when publishing project source unless the user specifically asks to publish feedback.

Catalog: grouped arrays `[{group,items:[[id,text],…]}]`. IDs are lowercase letters, digits and hyphens (1–100 characters). Additional rows created in the browser live in `state.custom` with `custom-…` IDs. A row must not appear in both catalogs.

Snapshot: `{schemaVersion:1,updatedAt,state:{entries,custom,edits,archived}}`. An entry contains `status` (`todo`, `assumed`, `pass`, `fail`), `notes`, optional `notesHistory` and `screenshots`. User text overrides for base rows live in `edits`. `archived` contains stable IDs; restoring changes membership only, never row order. Do not physically remove archived rows. Screenshots include URL/name and either `phase:'base'` or `phase:'note',note:<zero-based index>`; preserve the phase when moving an existing current note into history.

All reads/writes use UTF-8. The helper backs up data before edits in `OUTPUT/review-backups/<timestamp>/`. The server serializes writes, atomically replaces files and rejects stale browser saves using a revision token derived from both state and catalog. If a stale-save warning appears, retain/export unsaved human text before refreshing. Do not fix conflicts by discarding one side.

`open` detects the original viewer-style layout (`review/index.html`, `scripts/review-server.js`, `config.json.review`) and can open/restart its existing server without replacing it. `read`/`sync`/`reset` can adopt that schema, preserving its data. Existing server security/version behavior is not silently upgraded. Refresh the legacy page after file changes so its own prompt generator restores any project-specific prompt formatting. Never replace a working customized review site with the template merely to open it.

Servers for new projects choose a free loopback port, so different projects can coexist. Identity checks compare the canonical project folder before reusing a URL. Detached launches use hidden windows on Windows. A restart never resets reviews. The optional `--port` flag selects a requested port; a collision must report an error, not open another project's page.
