# NudgeCore

A React Native task manager that keeps your to-do list in front of you through persistent, ambient notifications — not a calendar you scroll past and ignore.

NudgeCore runs a foreground service that evaluates your task list every 30 seconds and surfaces the most relevant pending task in your notification shade. You respond directly from the notification: mark it done, say you're working on it, or push it aside for later. The app then moves on to the next thing.

---

## How it works

### Task scheduling
- Tasks without a due date ("anytime" tasks) are surfaced randomly while they're eligible.
- Tasks with a due date are prioritized once their time arrives.
- **Done** — marks the task complete and immediately surfaces the next one.
- **Working on it** — snoozes the task for 25 minutes.
- **Later** — snoozes the task for a random 1–10 minutes (dismissing the notification has the same effect).

### Foreground service
The app registers an Android foreground service on launch. This service runs a polling loop every 30 seconds to evaluate which task should be shown. It persists even when the app is backgrounded or the screen is off, ensuring you're never left without a nudge.

### Local-only storage
All data lives on-device:
- **SQLite** (via `op-sqlite`) — task records with status, due time, and snooze state.
- **MMKV** — fast key-value store for runtime state (active task ID, last evaluation timestamp).

---

## Tech stack

| Layer | Library |
|---|---|
| Framework | React Native 0.85.3 / React 19.2.3 |
| Language | TypeScript |
| Database | `@op-engineering/op-sqlite` |
| Notifications | `@notifee/react-native` |
| Runtime state | `react-native-mmkv` |
| Navigation | `@react-navigation/native` + `native-stack` |
| Date picker | `@react-native-community/datetimepicker` |
| JS engine | Hermes |
| Architecture | React Native New Architecture (Nitro Modules, Fabric) |
| Package manager | Bun |

---

## Prerequisites

Before setting up, make sure you have the full React Native environment installed. Follow the official guide for your OS:

- [Set up your environment — React Native docs](https://reactnative.dev/docs/set-up-your-environment)

You will need:
- **Node.js** >= 22.11.0
- **Bun** (used instead of npm/yarn — install from [bun.sh](https://bun.sh))
- **Android Studio** with Android SDK, platform tools, and an emulator or physical device
- **Java 17** (required by the Gradle build)
- **Watchman** (recommended for file watching on macOS/Linux)

For iOS builds you additionally need:
- **Xcode** (macOS only) with Command Line Tools
- **CocoaPods** via Bundler (`gem install bundler`)

---

## Setup

### 1. Clone and install dependencies

```sh
git clone <repo-url>
cd NudgeCore
bun install
```

### 2. Android — run in development

Start the Metro bundler in one terminal:

```sh
bun run start
```

In a second terminal, build and launch on your connected device or emulator:

```sh
bun run android
```

> **Note:** NudgeCore uses native modules (`op-sqlite`, `notifee`, `react-native-mmkv`) that require a native build — Expo Go will not work.

### 3. iOS — run in development (macOS only)

Install Ruby gems and CocoaPods (first time only, or after native dependency changes):

```sh
bundle install
bundle exec pod install
```

Then run:

```sh
bun run ios
```

> The foreground service feature is Android-only. On iOS the app will launch, but background nudging is not yet implemented.

---

## Project structure

```
NudgeCore/
├── index.js                     # Entry point: foreground service + background event handler registration
├── App.tsx                      # Root component: navigation, DB init, notification bootstrap
├── src/
│   ├── types.ts                 # Task type definition
│   ├── theme.ts                 # Dark color palette, spacing, border radius
│   ├── utils.ts                 # generateId, randomSnoozeMs, formatDueAt
│   ├── db/
│   │   └── index.ts             # SQLite layer: CRUD operations + priority task query
│   ├── services/
│   │   ├── notifications.ts     # Notification channels, foreground service notif, task notif display
│   │   ├── scheduler.ts         # Core logic: evaluateAndDisplay, handleDone/Working/Later
│   │   ├── foreground.ts        # Foreground service task (30s polling loop)
│   │   └── runtime.ts           # MMKV-backed runtime state (activeTaskId, lastEvaluatedAt)
│   └── screens/
│       ├── TaskListScreen.tsx   # Pending task list + foreground notification event handler
│       └── AddTaskScreen.tsx    # New task form (title, description, optional due date/time)
├── android/                     # Android native project
│   └── app/
│       └── build.gradle         # App ID: com.nudgecore, versionCode 1
└── ios/                         # iOS native project
```

---

## Notification channels

| Channel | Purpose | Importance |
|---|---|---|
| `nudgecore_tasks` | Task reminder notifications with action buttons | High (heads-up) |
| `nudgecore_service` | Persistent foreground service indicator | Low (silent, hidden on lock screen) |

The foreground service notification is required by Android to keep the background service alive. It shows in the notification shade as "NudgeCore — Watching your task list..." and updates to show the current task title.

---

## Required Android permissions

These are declared in the native Android manifest (managed by `@notifee/react-native`):

- `FOREGROUND_SERVICE` — run the background polling service
- `FOREGROUND_SERVICE_SPECIAL_USE` — required for foreground services on Android 14+
- `POST_NOTIFICATIONS` — show task and service notifications (requested at runtime)
- `RECEIVE_BOOT_COMPLETED` — (available for future auto-start on device reboot)

---

## Development commands

```sh
bun run start          # Start Metro bundler
bun run android        # Build and run on Android
bun run ios            # Build and run on iOS
bun run test           # Run Jest tests
bun run lint           # Run ESLint
```

---

## Database schema

```sql
CREATE TABLE tasks (
  id            TEXT    PRIMARY KEY,
  title         TEXT    NOT NULL,
  description   TEXT,
  due_at        INTEGER,           -- Unix ms, null = anytime task
  next_remind_at INTEGER,          -- Unix ms, null = eligible now
  status        TEXT    NOT NULL DEFAULT 'pending',  -- 'pending' | 'completed'
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  source        TEXT    NOT NULL DEFAULT 'phone'
);

CREATE INDEX idx_tasks_status_remind ON tasks (status, next_remind_at);
```

The `source` field is reserved for future multi-source support (e.g., tasks pushed from a desktop companion). Currently always set to `'phone'`.

---

## What's not done yet

See [TODO list in memory](project_todo.md) for the full list. Key gaps:

- **Completed tasks view** — no screen to see finished tasks
- **Edit task** — tasks can be added and deleted but not modified
- **iOS background handling** — foreground service is Android-only; iOS needs BGTaskScheduler
- **Release signing** — currently uses the debug keystore for release builds
- **Proguard** — disabled in `build.gradle`, should be enabled for production APK/AAB
- **Tests** — only a single smoke test; no coverage of scheduler logic or DB functions

---

## Troubleshooting

**Metro bundler can't find native module**
Run `bun run android` (a full native build) before using Metro. Native modules require a compiled native layer.

**`op-sqlite` crash on launch**
This usually means the New Architecture bridging failed. Confirm `newArchEnabled=true` in `android/gradle.properties` and that your `@react-native/react-native` version matches the native module's peer dependency.

**Foreground service notification not appearing**
On Android 13+, notification permission must be granted at runtime. The app requests this on launch via `requestNotifPermission()`. Check app settings if the permission was denied.

**Build fails with JVM memory error**
Increase the Gradle JVM heap in `android/gradle.properties`:
```
org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m
```

For further React Native issues, see the [official troubleshooting guide](https://reactnative.dev/docs/troubleshooting).
