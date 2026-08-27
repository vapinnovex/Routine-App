# Routine

A local-first mobile app for daily tasks, progress, and reusable multi-section timers. This is V0 of a personal productivity product — no accounts, no AI, no cloud.

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

- Node 20+
- npm
- Expo Go on your phone, or Xcode / Android Studio for a development build

```bash
cd "Productivity & Routine App"
npm install
```

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
| `zustand`                                              | Local application state, easy to swap for a backend later |
| `@react-native-async-storage/async-storage`            | Persist tasks, sessions, profile                          |
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

## 6. Local storage architecture

Three Zustand stores persist independently:

| Store           | AsyncStorage key | Contents                             |
| --------------- | ---------------- | ------------------------------------ |
| `useUserStore`  | `routine-user`   | Name, onboarding, preferences        |
| `useTaskStore`  | `routine-tasks`  | Tasks + occurrence map               |
| `useTimerStore` | `routine-timer`  | Saved sessions + active/paused timer |

The UI never talks to AsyncStorage directly. Screens call store actions; actions persist through Zustand `persist` middleware.

On launch, the root layout waits until all three stores have rehydrated. If a timer was running when the app was killed, it is reconstructed with `catchUpTimer(now)` so elapsed time is based on timestamps, not a JS interval.

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
- No iCloud / Google backup. Clearing app data or uninstalling removes local state.
- Expo Go cannot use custom notification sounds on every platform; the in-app chime still plays in the foreground.

## 9. Recommended next steps

1. Development builds (`npx expo prebuild`) so notification channels and keep-awake are fully native.
2. Import for the JSON export, plus an optional encrypted backup.
3. Calendar widgets / lock-screen live activity for the running timer.
4. Richer recurrence (end dates, skip dates).
5. Sync layer behind the existing stores when you add an account.
6. Health, nutrition, and AI modules as separate `src/features/` packages — do not fold them into the task store.

## Scripts

```bash
npm start          # Expo dev server
npm test           # Recurrence, completion, stats, timer tests
npm run typecheck  # TypeScript
```

Sample data is offered on first launch (“Get started”) and can be reloaded from Settings.

## 10. Web PWA

The web build is a static PWA. `public/manifest.json`, `public/service-worker.js`, and the generated `public/pwa-*.png` files are copied into `dist/` by Expo’s static export. The service worker uses a network-first strategy for navigations and a cache-first strategy for same-origin assets; the local-first stores continue to provide the app data offline.

### Deploy over HTTPS

Build the production web bundle:

```bash
npm run web:export
```

Deploy the contents of `dist/` to a static host with HTTPS enabled and SPA fallback to `index.html`. For example, with Vercel, Netlify, GitHub Pages, or another static host, configure the site’s production domain and point its output directory at `dist`. Do not use an HTTP-only URL: service workers and iPhone installation require a secure origin. `localhost` is secure for development, but it is not a public URL that an iPhone can reach.

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
4. Turn off the network or enable **Offline** in developer tools, close the tab, and open the same URL again. The app shell should start and previously loaded routes/assets should remain available.
5. Restore the network and reload after a release. The service worker cache version (`routine-web-v1`) should be incremented when cache behavior or shell files require an explicit refresh.

### iPhone Safari test and installation

Use the deployed HTTPS URL on the iPhone, not the Expo development server:

1. Open the URL in Safari and let the app finish loading once while online.
2. Tap **Share**, choose **Add to Home Screen**, keep the name as `Routine`, then tap **Add**.
3. Launch Routine from the new Home Screen icon. It should open without Safari chrome and retain the app’s local data.
4. For the offline check, open the installed app once online, enable Airplane Mode, then launch it again. Verify the shell and previously visited screens open. Turn Airplane Mode off afterward.

Safari does not expose Chrome’s service-worker panels on iPhone. Validate activation and cache contents in desktop Safari’s **Develop > [iPhone] > Web Inspector** while the phone is connected, then repeat the real Home Screen and Airplane Mode test on the device.
