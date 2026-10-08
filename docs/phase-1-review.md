# Phase 1 review and release notes

## Product rules

- **Daily streak:** complete at least one task on each scheduled day. A day without scheduled work is neutral. Today's unfinished work does not break the streak until the day ends. A skipped or unfinished past scheduled day breaks it.
- **Task streak:** consecutive completed scheduled occurrences of that task. Weekends/rest days are neutral; the current day has the same grace period. A weekly task's streak counts occurrences, not elapsed calendar days.
- **Monthly progress:** includes scheduled work through today; future work remains visible on the calendar but does not lower completion. Historical completions are unioned with the current schedule by task ID, avoiding duplicate counts and percentages over 100%.
- **Dates:** Phase 1 personal routines use the device's local calendar. Focus consistency also uses local dates. Shared Phase 2 challenges must use a single server-defined publication window instead.
- **Completion:** checking all subtasks completes a task. Reopening an automatically completed task clears its checked subtasks; reopening a manually completed task preserves partial subtask progress. Skipping overrides completion. Future/unscheduled occurrences cannot be completed through the UI/store.
- **Timers:** one active run at a time. Starting another takes the user back to the current run. Focus time for new runs excludes breaks, pauses, and skipped remaining time. Previously recorded history retains its original values. End/restart requires confirmation; a quick timer can be repeated.

## Screens reviewed and updated

| Screen / flow | Changes |
| --- | --- |
| Welcome / account | Narrow readable form; revised introduction; sample data opt-in; install guidance; session bootstrap recovery |
| Home | Responsive content width; current streak grace period; resume current timer; bounded quick entry; install action |
| Tasks | Today / searchable All tasks / Calendar; past and upcoming tasks remain discoverable; explicit month controls |
| Task editor | Browser date/time controls; API-compatible validation and title limits; weekday validation; preserve recurrence end date and subtask identity |
| Task detail | Future completion disabled; meaningful skipped state; history dates are selectable; consistent streak guidance; accurate account-wide deletion copy |
| Progress | Future dates excluded from totals; seven-column heatmap; month/date selection stays aligned; functional subtask checkboxes; corrected category and focus statistics |
| Timer library | Current run surfaced; content clears the floating navigation; keyboard ordering on web; native drag retained |
| Session editor | Title/section limits; disallow zero duration; browser ordering fallback |
| Active timer | Scrollable responsive layout; end/restart confirmation; sound preference respected; elapsed focus accounting; foreground catch-up |
| Completion | Quick/deleted-template replay via stored snapshot; measured focus time |
| Settings | Profile constraints; labeled toggles; honest browser notification availability; permission denial feedback; downloadable JSON export; install guidance |
| Shared UI | Maximum widths; safe-area-aware tab bar; centered sheets with explicit Close; keyboard focus styles; reduced-motion CSS; stronger primary contrast |

## Backend and integration

Account writes remain atomic, revision-checked and retryable with the original mutation ID. New `schemaVersion: 1` defaults preserve legacy snapshots. Active timer focus checkpoints are validated and persisted. Invalid recurrence configurations are rejected at both form and API boundaries. A partial login failure can retry loading the newly established session.

Phase 1 remains **online-first**: the PWA caches application assets, not account data. Pending edits remain in memory. The existing retry/conflict panel and before-unload warning protect those edits; an installed app still needs the API to load its account. This is not a persistent offline queue.

## PWA release behavior

- Install guidance is available from Welcome, Home and Settings. Chromium uses its install prompt when available; Safari gets manual Home Screen/Dock instructions. Standalone mode hides the prompt.
- Navigation caches use the actual request URL, never replacing the home shell with an arbitrary route.
- Only known static assets are cached. API/authenticated/cross-origin requests and private/no-store responses are excluded.
- The first install precaches the entry bundle; cleanup only removes Routine caches.
- Each `npm run web:export` clears Metro's environment-sensitive cache and stamps a release-specific service worker cache. Updates wait for old tabs to close to avoid interrupting edits.
- `npm run web:serve` serves on port 8081 with SPA fallback, including dynamic task links.

## Verification and release boundary

Automated suites cover recurrence, completion, streaks, timezone-sensitive focus statistics, timer math, synchronization, service-worker isolation, real MongoDB API persistence, authentication, account isolation, conflict/idempotency handling, and Phase 2 contract validation. Run:

```sh
cd frontend
npm test -- --runInBand
npm run typecheck
npm run web:export
```

```sh
cd backend
.venv/bin/python -m pytest -q
```

Local verification passed: 42 frontend tests, 17 backend tests with MongoDB, TypeScript checking, and production export of all 16 routes. The browser walkthrough used an isolated local database and synthetic account, verifying registration, task completion persisted after reload, recurrence/subtask editing, timer ordering and pause recovery, and progress at a 320px viewport. A live midnight rollover preserved the current streak and updated monthly totals. A React Navigation focus/aria-hidden warning was observed; a complete assistive-technology audit remains outstanding.

Browser walkthrough uses an isolated local database and synthetic account. Production release still requires the real HTTPS frontend/API configuration and physical iPhone/Android Home Screen installation checks. Native builds and notification delivery require real-device validation; browser layout checks do not establish native-device compatibility.

Deployment requirements: set `EXPO_PUBLIC_API_URL` to the deployed HTTPS API or configure a same-origin `/api/v1` reverse proxy; configure exact CORS origins and secure cookies; serve manifest/icons/worker publicly. The provided Vercel configuration serves the frontend only and does not deploy FastAPI. Do not send API routes into the SPA fallback when configuring a reverse proxy.

Sources consulted: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [MDN installation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [MDN install prompts](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt), [MDN caching](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching).

## Signup and install refinement — October 9, 2026

The install suggestion is now a compact top row with an Install action and a 44px dismiss target. Dismissal is saved as a browser-only presentation preference, synchronized across mounted screens/tabs, and respected after reload. Account data remains server-backed. Installation instructions appear only when requested.

Account submission is enabled until a request is in progress. Missing/invalid fields show inline guidance and focus the first field requiring attention, preserving the API's 10-character registration password minimum. Persistent labels, password visibility, and keyboard submission improve the form. A synthetic account was registered through the browser against the local API and remained authenticated after reload. Dismissal was checked across navigation and reload. All 46 frontend tests, TypeScript checks, and the production export passed.
