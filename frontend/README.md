# Routine

An Expo mobile and web app for daily tasks, progress, and reusable timers, backed by a Python FastAPI API and MongoDB. Register or log in to load your account's data across devices.

## 1. Project structure

```text
src/
  app/                 Expo Router screens (tabs + stacks)
  components/          Reusable UI (buttons, calendar, timer display, …)
  features/
    dashboard/         Home
    tasks/             Task list, editor, detail, monthly progress
    timer/             Sessions, editor, immersive runner
    settings/
    onboarding/
  store/               Zustand stores (user, tasks, timer)
  services/            Recurrence, stats, timer engine, notifications
  theme/               Light/dark tokens
  types/               Shared models
  utils/               Dates, ids, formatting
  hooks/
  __tests__/           Unit tests for core logic
assets/                Icons, splash, timer chime
```

`app/` lives under `src/app` so Expo Router can pick it up automatically.

## 2. Setup

Requirements:

- Node 22.13+ (Expo SDK 57)
- npm
- Expo Go on your phone, or Xcode / Android Studio for a development build

```bash
cd frontend
npm ci
cp .env.example .env
```

In PowerShell use `Copy-Item .env.example .env`. Start the backend using
[the backend setup guide](../backend/README.md). Set `EXPO_PUBLIC_API_URL` in `.env`:

| Client | Example API address |
| --- | --- |
| Browser / iOS simulator | `http://localhost:8000/api/v1` |
| Android emulator | `http://10.0.2.2:8000/api/v1` |
| Physical phone | `http://YOUR-COMPUTER-LAN-IP:8000/api/v1` |

The phone and computer must share a network and port 8000 must be reachable. Use HTTPS
for deployed builds. Restart Expo after changing the API URL. Add web origins to the backend's
`CORS_ORIGINS`. API credentials and MongoDB URIs belong only in the backend environment.

## 3. Run on iOS

Fastest path (physical iPhone or simulator):

```bash
npm start
```

Then:

- iPhone: install **Expo Go** from the App Store, scan the QR code
- Simulator: press `i` in the terminal

Notifications, background timer catch-up, and haptics work best on a real device.

For a standalone iOS build later:

```bash
npx expo run:ios
```

That requires Xcode and will generate a native `ios/` project.

## 4. Run on Android

```bash
npm start
```

Then:

- Android phone: install **Expo Go**, scan the QR code
- Emulator: press `a`

For a standalone Android build:

```bash
npx expo run:android
```

## 5. Dependencies and why they exist

| Package                                                | Why                                                       |
| ------------------------------------------------------ | --------------------------------------------------------- |
| `expo` / `react-native` / `react`                      | App runtime                                               |
| `expo-router`                                          | File-based navigation (tabs + task/timer stacks)          |
| `typescript`                                           | Strict typing                                             |
| `zustand`                                              | In-memory UI state synchronized with the backend          |
| `expo-secure-store`                                    | Native login session token storage                       |
| `react-native-reanimated`                              | Progress and checkbox motion                              |
| `react-native-gesture-handler`                         | Navigation gestures                                       |
| `react-native-svg`                                     | Icons and progress ring                                   |
| `expo-haptics`                                         | Completion feedback                                       |
| `expo-notifications`                                   | Local timer section notifications                         |
| `expo-av`                                              | Section-complete chime                                    |
| `expo-keep-awake`                                      | Keep the screen on during a running session               |
| `expo-file-system` / `expo-sharing` / `expo-clipboard` | Data export                                               |
| `@react-native-community/datetimepicker`               | Task date/time                                            |
| `jest` / `ts-jest`                                     | Unit tests for recurrence, stats, timer math              |

There is no NativeWind layer. Styling uses a shared token file (`src/constants/theme.ts`) plus `StyleSheet` so light/dark stay semantic rather than inverted.

## 6. Backend data architecture

Three Zustand stores hold in-memory data loaded after authentication:

| Store | Contents |
| --- | --- |
| `useUserStore` | Account profile and preferences |
| `useTaskStore` | Tasks, subtasks, ordering, and dated completion records |
| `useTimerStore` | Timer templates, ordering, active/paused timer, completed runs |

Screens call store actions. `services/accountSync.ts` serializes changes through
`PUT /api/v1/users/me/data`; the server validates and atomically stores each revision.
The API also provides resource CRUD routes for tasks, sessions, occurrences, and history.
Saving status and failures are visible. A failed save remains in memory for retry; a conflicting
edit requires explicitly discarding unsaved changes and reloading. Settings offers server
refresh, export, account-data reset, and logout. Export waits for saves and fetches MongoDB data.

On launch, the root layout loads the account from the backend before showing protected screens.
An overdue timer is recovered through the normal completion flow so history and linked task
completion are also saved. Web sessions use an HttpOnly cookie; Android/iOS tokens use SecureStore.
No task/profile data is written to AsyncStorage or localStorage. Existing data from the old
device-only version is not automatically imported or removed; new accounts start empty unless
sample data is selected during registration.

## 7. Data model

**Task** is the template: title, category, date, optional time, recurrence rule, subtask templates.

**TaskOccurrence** is the per-day instance, keyed by `taskId:date`. Completing a repeating task does not clone thousands of rows. Occurrences are created only when the user interacts with that day.

**Recurrence** is a rule (`none`, `daily`, `weekly`, `weekdays`, `monthly`, `custom interval`). Dates are generated on demand for Today, Upcoming, Calendar, and monthly stats.

**TimerSession** stores named routines. **TimerSection** has a title, activity/break type, duration in seconds, and order.

**ActiveTimerState** stores `sectionEndsAt` (epoch ms). Remaining time is always `sectionEndsAt - Date.now()`. Pause stores `remainingMsWhenPaused`.

## 8. Known limitations (V0)

- Drag-and-drop for timer sections uses up/down reorder rather than a full drag list (still unlimited sections).
- Task reminders can be toggled in Settings; V0 does not yet schedule a daily reminder clock. Timer section notifications do.
- Local notifications require OS permission and Expo Go / a dev build with the notifications plugin.
- Export writes JSON (share sheet or clipboard). There is no import yet.
- Recurrence does not yet support “last Friday of the month” style rules.
- Account loading and saving require a reachable backend. There is no persistent offline queue;
  keep the app open until pending changes are saved. MongoDB backup operations remain a deployment concern.
- Expo Go cannot use custom notification sounds on every platform; the in-app chime still plays in the foreground.

## 9. Recommended next steps

1. Development builds (`npx expo prebuild`) so notification channels and keep-awake are fully native.
2. Import for the JSON export, plus an optional encrypted backup.
3. Calendar widgets / lock-screen live activity for the running timer.
4. Richer recurrence (end dates, skip dates).
5. Incremental synchronization and separate history collections for larger accounts.
6. Health, nutrition, and AI modules as separate `src/features/` packages — do not fold them into the task store.

## Scripts

```bash
npm start          # Expo dev server
npm test           # Recurrence, completion, stats, timer tests
npm run typecheck  # TypeScript
```

Sample tasks and timers can be included when registering an account.

## 10. Web PWA

The web build is a static PWA. `public/manifest.json`, `public/service-worker.js`, and the
`public/pwa-*.png` files are copied into `dist/` by Expo's static export. The service worker
caches the app shell and assets, but excludes `/api/`, authenticated requests, and no-store
responses. Account data requires the backend, including when starting an installed PWA.

### Deploy over HTTPS

Build the production web bundle:

```bash
npm run web:export
```

Deploy the contents of `dist/` to a static host with HTTPS enabled and SPA fallback to `index.html`. Vercel reads the repository’s `vercel.json`, which sets the export command, `dist` output directory, SPA fallback, and PWA response headers. Do not use an HTTP-only URL: service workers and iPhone installation require a secure origin. `localhost` is secure for development, but it is not a public URL that an iPhone can reach.

For a public Vercel PWA, disable **Deployment Protection** for the production deployment, or configure an equivalent public access rule. A protected preview URL redirects `/manifest.json` to `vercel.com/sso-api`; browsers then report that redirect as a CORS error and Safari cannot install the PWA. Use the production `.vercel.app` URL or a custom domain after protection is removed.

Before publishing, confirm these URLs return `200` from the deployed domain:

```text
/manifest.json
/service-worker.js
/pwa-180.png
/pwa-192.png
/pwa-512.png
```

### Offline startup test

1. Open the deployed HTTPS URL in Chrome or Safari while online and wait for the first load to finish.
2. In browser developer tools, inspect **Application > Service Workers** and confirm `service-worker.js` is activated. Confirm the manifest and cached resources are present under **Cache Storage**.
3. Reload once while online so the current document is cached.
4. Turn off the network and reopen the URL. The cached shell should show a connection error; account screens require a connection. Restore the network and choose Retry.
5. Restore the network and reload after a release. Increment the service worker cache version when changing cache behavior.

### iPhone Safari test and installation

Use the deployed HTTPS URL on the iPhone, not the Expo development server:

1. Open the URL in Safari and let the app finish loading once while online.
2. Tap **Share**, choose **Add to Home Screen**, keep the name as `Routine`, then tap **Add**.
3. Launch Routine from the new Home Screen icon. Sign in if needed and verify that account data loads from MongoDB.
4. Enable Airplane Mode and relaunch. Verify the connection-error state, then restore connectivity and Retry.

Safari does not expose Chrome’s service-worker panels on iPhone. Validate activation and cache contents in desktop Safari’s **Develop > [iPhone] > Web Inspector** while the phone is connected, then repeat the real Home Screen and Airplane Mode test on the device.
