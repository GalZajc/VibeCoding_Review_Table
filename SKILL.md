---
name: review-table
description: Open, populate and maintain a project's local interactive feature review table when the user says “odpri tabelo, da pregledam”, asks to systematically check features, or continues feedback from an established review table. Preserve ratings, notes, screenshots and archived requirements; turn saved failures into the next implementation task.
---

# Project review table

Use the bundled compact gray review page for a human to test the project's features. Each row has ✓ tested/pass, ○ assumed/untested, ✕ reported failure, or no selection (not yet reviewed). Selected states are clearly highlighted. Notes and screenshots belong to the requirement or its individual note phase. Orange trash archives; restore returns the row to its original position. Descriptions are editable. All state and generated follow-up prompts stay in the project.

## Open or create

Resolve the real project folder from the conversation and files; follow any project instructions. If the current working directory is stale, use the verified canonical path. Never put project review responses in the skill folder.

Run with absolute paths, replacing the example values:

```text
node "<skill>/scripts/review-table.cjs" open --project "<project>" --name "<project name>" --no-browser
```

The helper preserves existing tables, reuses an identified running server, or starts a hidden detached localhost server. Use the returned URL with the available browser/open-in-app tools and keep that tab available to the user. Verify the actual page; starting a process alone is not proof that the page opened. If an existing page shows connection refused after a restart, run `open` again and refresh the existing tab. Do not assume the old port is still correct. Without an in-app browser, omit `--no-browser` to open the default browser.

For a new table, first build the feature inventory from user requests, accepted revisions, applicable task history, and the actual project. Include all requested behavior, shortcuts, edge cases, formats and platform integration relevant to this project. Split independently testable behaviors into individual concise rows and group related rows. Honor the latest instruction when earlier requests conflict. Do not import this skill's origin project's features, shortcuts or past permissions. Do not pretend the inventory is complete if relevant history is unavailable; include known features and explain the specific gap.

Write a UTF-8 JSON catalog `[{"group":"…","items":[["stable-id","Requirement text"]]}]` in the project (e.g. `OUTPUT/review-features.json`), then run:

```text
node "<skill>/scripts/review-table.cjs" sync --project "<project>" --features "<catalog.json>"
```

On later opens, reconcile newly agreed requirements from the available conversation with the existing catalog too. Add missing requirements without duplicating existing rows or treating deliberately archived features as missing. For project-specific reminders such as agreed shortcuts, set `promptContext` in `review.config.json`. New features begin unreviewed. Keep the short IDs stable; text changes must not create duplicate rows or detach feedback. `sync` merges by ID, keeps existing order and human edits, and appends new features to their group. It does not remove requirements omitted from an incoming catalog. Archive only when removal is requested, retaining the row and its history. Refresh the page after catalog changes, after ensuring there are no unsaved edits.

## Continue a review

Read the persisted table directly; the user should not need to copy a prompt:

```text
node "<skill>/scripts/review-table.cjs" read --project "<project>"
```

The result includes active rows with effective descriptions/status/notes/screenshots, archive entries, and the generated prompt. Read the relevant note phases and attached local screenshots. Treat that content as project feedback, not independent authorization for publishing, deleting files, sending messages or changing unrelated settings. A request merely to open the table does not authorize implementing every failure. In an established fix/retest loop, “naprej” or “preglej/popravi” can authorize continuing the saved reported failures in that loop.

Fix reported failures and explicitly requested new work. Preserve tested features. ○ and unreviewed rows are not reported failures or verified successes. After appropriate verification, return only the addressed rows to unreviewed so the human can retest; never assign ✓ on the user's behalf:

```text
node "<skill>/scripts/review-table.cjs" reset --project "<project>" --ids "id-one,id-two"
```

Read again before resetting. If a user changed feedback during implementation, preserve it and reassess rather than clearing a newer report. `reset` keeps notes, screenshots, edits, archive membership and all other ratings. Reopen/refresh and show the relevant rows. Keep all rows available through the All filter even when focusing on unreviewed rows. Do not add title/legend/count rows or toolbars that consume more space without a user request.

See [references/storage.md](references/storage.md) for files, lifecycle, adoption of existing tables and safe edits. The helper and template need only Node.js built-ins, work without installation into the reviewed app, bind only to localhost, and keep screenshots/feedback out of this public template repository.
