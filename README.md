# VibeCoding Review Table

A reusable **Codex skill and local feature-review table**, extracted from the review workflow developed for Video Audio Image Viewer. Each project gets its own portable page, feature catalog and private feedback. No original project's requirements, screenshots, ratings or permissions are included.

Tell the assistant **“odpri tabelo, da pregledam”**, **“open the review table”**, or explicitly invoke **`$review-table`**. The skill explains how to populate all known project requirements, keep them current, read saved failures directly, implement an authorized review round and reset only the addressed rows for human retesting.

## Install the skill

Requires Node.js 18 or newer; no npm dependencies, Python, Electron or hosted backend. Clone this repository and install its skill files:

```powershell
git clone https://github.com/GalZajc/VibeCoding_Review_Table.git
Set-Location -LiteralPath '.\VibeCoding_Review_Table'
node scripts/install-skill.cjs
```

The installer uses `$CODEX_HOME/skills/review-table` or `~/.codex/skills/review-table`. If the current chat does not discover a newly installed skill, open a new chat or mention its `SKILL.md` path. Installation does not edit unrelated Codex configuration.

## What the table does

- Compact gray page with search and All / unreviewed / assumed / failed / passed filters.
- ✓ tested/pass, ○ assumed without testing, ✕ reported failure, or no selection. Selected icons turn light blue.
- Click requirement text to edit; Ctrl+Enter/blur saves, Escape cancels.
- Notes with phase-specific screenshots, paste/drop/file upload and note history.
- Add a requirement from the page; archive any row with an orange trash icon. Restore with a crossed trash icon to exactly its original place.
- Local autosave and downloadable JSON/Markdown; generated next prompt keeps failures, known working behavior, unreviewed/assumed states and archive separate.
- Independent projects and server identity checks. Servers bind only to loopback and restart without clearing progress. Stale browser saves cannot silently overwrite newer file edits.

## Use without a Codex installation

```powershell
node scripts/review-table.cjs open --project "C:\path\to\your-project" --name "Your project"
```

For in-app browser control, use `--no-browser` and open the returned URL. Populate the table with a UTF-8 grouped catalog:

```json
[{"group":"Files","items":[["open-file","Open a chosen file"],["unicode-path","Preserve paths containing č, š and ž"]]}]
```

```powershell
node scripts/review-table.cjs sync --project "C:\path\to\your-project" --features "C:\path\to\features.json"
node scripts/review-table.cjs read --project "C:\path\to\your-project"
node scripts/review-table.cjs reset --project "C:\path\to\your-project" --ids "open-file"
```

`sync` merges rather than replacing the catalog. Human edits, ratings, notes, screenshots and archived rows remain intact. New rows are unreviewed. `reset` changes only the selected active row statuses; it never assigns pass automatically. Refresh the page after external edits, preserving any unsaved browser text first. The helper backs up edited files under the project's `OUTPUT/review-backups`.

Files are kept under the target project's `review/`, `scripts/`, `review.config.json` and private `DATA/`. Add `DATA/` and `OUTPUT/` to that project's ignore rules when publishing. Keep app-specific prompt reminders in `review.config.json` → `promptContext`. Existing viewer-style review tables are adopted without overwriting their code. See [storage details](references/storage.md).

Run `npm test` to verify persistence, conflict protection, project isolation, merging and selective resets. Publishing this template does not authorize an assistant to publish any reviewed project or its feedback.
