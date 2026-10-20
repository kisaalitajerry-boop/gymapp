# Task List: Commercial openGym Fork

Conventions:
- Test: `cd frontend && npm test`
- Build: `cd frontend && npm run build`
- Mobile: `npm run build:mobile`, then run in Android Studio / Xcode
- New logic goes in pure functions under `frontend/src/lib/` with `*.test.js` beside them.

---

## Phase 0: Foundation & De-risking

## Task 1: Licensing & compliance audit
**Description:** Write down what AGPL-3.0, the NOTICE.md app-store exception and the
hasaneyldrm exercise-media terms allow for a paid, closed-store app. Decide go/no-go on
reusing the media.
**Acceptance criteria:**
- [x] `docs/LICENSING_DECISION.md` records obligations and the media decision
- [x] Upstream author contacted if the app-store exception's scope for forks is unclear
**Verification:** Manual review by you (ideally a lawyer)
**Dependencies:** None
**Files:** `docs/LICENSING_DECISION.md`
**Scope:** XS

## Task 2: Local dev baseline
**Description:** Install deps and run the frontend dev server, API and the existing test suite on Windows.
**Acceptance criteria:**
- [x] `npm test` passes in `frontend/` with no changes
- [x] App loads at the Vite dev URL and a workout can be logged in guest mode
**Verification:** Tests green; manual smoke test
**Dependencies:** None
**Files:** none (maybe `.env`)
**Scope:** XS

## Task 3: Rebrand
**Description:** New app name, bundle/application IDs, icons, splash and theme accent. Keep upstream attribution.
**Acceptance criteria:**
- [x] `capacitor.config.json` appId and appName updated (`com.muscletrack.app` / `MuscleTrack`); Android/iOS projects synced
- [x] Icons/splash and MuscleTrack SVG logo added in `Icon.jsx` and `index.html`
- [x] Dark slate & neon mint design system tokens implemented in `index.css`
- [x] Attribution to openGym kept in About/Settings and NOTICE.md
**Verification:** Build succeeds; Android build shows new name and icon
**Dependencies:** T2
**Files:** `frontend/capacitor.config.json`, `frontend/index.html`, `frontend/public/manifest.json`, `frontend/src/index.css`, `frontend/src/views/Settings.jsx`
**Scope:** M

## Task 4: Storage adapter interface
**Description:** Pull all file reads/writes in `api/server.js` behind a `storage` interface
(`getUser`, `saveState`, ...), with the JSON implementation as the default. No behavior change.
**Acceptance criteria:**
- [x] `server.js` no longer touches `fs` directly for user/state data
- [x] Existing API tests pass
**Verification:** `cd api && npm test`; manual login + sync
**Dependencies:** T2
**Files:** `api/server.js`, `api/storage/index.js`, `api/storage/json.js`
**Scope:** M

## Task 5: Postgres storage adapter
**Description:** Implement the storage interface on Postgres, chosen with `STORAGE=postgres`. Add a JSON→Postgres migration script.
**Acceptance criteria:**
- [x] The API test suite passes against both adapters
- [x] Migration script imports an existing `./data` folder losslessly
- [x] `docker-compose.yml` gets an optional `db` service
**Verification:** Tests on both adapters; round-trip a sample state file
**Dependencies:** T4
**Files:** `api/storage/postgres.js`, `api/migrations/*`, `scripts/migrate-json-to-pg.mjs`, `docker-compose.yml`
**Scope:** M

## Task 6: Hosted accounts
**Description:** Add Sign in with Apple and Google next to passkeys, issue sessions, and sync the mobile app's local data to the account.
**Acceptance criteria:**
- [x] A new user can sign up on mobile with Apple or Google and their data syncs
- [x] Guest/local data merges into the account on first sign-in
- [x] Endpoint to delete account + data exists
**Verification:** Manual on device; API tests for auth routes
**Dependencies:** T5
**Files:** `api/auth/*`, `api/server.js`, `frontend/src/views/Login.jsx`, `frontend/src/lib/api.js`
**Scope:** L → split into 6a (Apple), 6b (Google), 6c (local→account merge) when started

## Checkpoint A: Foundation
- [x] All tests pass, frontend + API build
- [x] Rebranded Android build runs and syncs to the hosted API
- [x] **Review with you before monetization work**

---

## Phase 1: Monetization

## Task 7: Entitlements module
**Description:** `lib/entitlements.js` exporting `FEATURES`, `TIERS`, `canUse(feature, entitlement)`, holding the Free/Pro matrix in one place.
**Acceptance criteria:**
- [x] Matrix covers every gated feature in the plan
- [x] Unit tests cover free, pro and expired states
**Verification:** `npm test`
**Dependencies:** T2
**Files:** `frontend/src/lib/entitlements.js`, `frontend/src/lib/entitlements.test.js`
**Scope:** S

## Task 8: RevenueCat integration
**Description:** Add `@revenuecat/purchases-capacitor`, configure products (monthly/annual), and expose purchase, restore and current entitlement in the store.
**Acceptance criteria:**
- [x] Sandbox purchase unlocks Pro; restore works after reinstall
- [x] Web/non-native builds fall back to Free without crashing
**Verification:** Google Play test track / StoreKit sandbox purchase
**Dependencies:** T3, T7
**Files:** `frontend/src/lib/purchases.js`, `frontend/src/store/useStore.js`, `frontend/package.json`
**Scope:** M

## Task 9: Paywall screen + `<ProGate>`
**Description:** A paywall view (benefits, price, trial, restore, terms links) and a `<ProGate feature>` wrapper that shows locked state or opens the paywall.
**Acceptance criteria:**
- [x] Any gated feature opens the paywall for Free users
- [x] Shows localized prices from RevenueCat offerings
**Verification:** Manual on device; build succeeds
**Dependencies:** T8
**Files:** `frontend/src/views/Paywall.jsx`, `frontend/src/components/ProGate.jsx`, `frontend/src/App.jsx`, `frontend/src/index.css`
**Scope:** M

## Task 10: Server-side entitlement sync
**Description:** RevenueCat webhook endpoint stores the entitlement per account. The API checks it for Pro-only endpoints (AI photo).
**Acceptance criteria:**
- [x] Webhook signature verified; entitlement persisted
- [x] Pro-only endpoint returns 402 for Free accounts
**Verification:** API tests with fixture webhook payloads
**Dependencies:** T6, T8
**Files:** `api/billing/webhook.js`, `api/server.js`, `api/test/billing.test.js`
**Scope:** S

## Task 11: Onboarding survey
**Description:** First-run flow: goal, experience, days/week, equipment, sex/age/height/weight, activity level. Generates a starter plan (reuse `lib/starter.js`), stores nutrition targets, then shows the paywall.
**Acceptance criteria:**
- [x] Completing the survey produces a weekly plan and calorie/macro/water targets
- [x] Survey is skippable and only shown once
- [x] Plan generation is a pure function with tests
**Verification:** `npm test`; manual first-run on fresh install
**Dependencies:** T9, T17
**Files:** `frontend/src/views/Onboarding.jsx`, `frontend/src/lib/onboarding.js`, `frontend/src/lib/onboarding.test.js`, `frontend/src/App.jsx`
**Scope:** M

## Checkpoint B: Monetization
- [x] Fresh install → survey → paywall → sandbox subscribe → Pro features unlock
- [x] Tests pass, builds clean
- [ ] **Review with you**

---

## Phase 2: Workout Utilities

## Task 12: Plate calculator logic
**Description:** `platesPerSide(target, barWeight, availablePlates, unit)` using a greedy fill with a remainder report. Supports kg and lb, with configurable bar and plate inventory.
**Acceptance criteria:**
- [x] 225 lb, 45 lb bar → [45, 45] per side; 100 kg, 20 kg bar → [25, 15]
- [x] Unreachable weights return the closest lower load + remainder
**Verification:** `npm test`
**Dependencies:** T2
**Files:** `frontend/src/lib/plates.js`, `frontend/src/lib/plates.test.js`
**Scope:** XS

## Task 13: Plate calculator popup
**Description:** Tap the weight on a barbell set in Workout to open a sheet with a visual barbell. Plate inventory lives in Settings.
**Acceptance criteria:**
- [x] Shown only for barbell exercises (`eq === 'barbell'`)
- [x] Respects the user's unit and inventory
**Verification:** Manual in a workout; build succeeds
**Dependencies:** T12
**Files:** `frontend/src/components/PlateSheet.jsx`, `frontend/src/views/Workout.jsx`, `frontend/src/views/Settings.jsx`
**Scope:** S

## Task 14: Substitution ranking logic
**Description:** `findSubstitutes(exId, {equipmentAllowed, limit})` ranks `EXDB` by same `tg`, then `sm` overlap (via `muscles.js` aliases), then equipment similarity.
**Acceptance criteria:**
- [x] Barbell bench press returns chest exercises, with dumbbell/machine options near the top
- [x] Never returns the original exercise; respects the equipment filter
**Verification:** `npm test`
**Dependencies:** T2
**Files:** `frontend/src/lib/substitute.js`, `frontend/src/lib/substitute.test.js`
**Scope:** S

## Task 15: Swap-exercise sheet
**Description:** "Swap" action on an exercise in an active workout. Replaces it for this session only, with an option to replace it in the routine.
**Acceptance criteria:**
- [x] Logged sets on the swapped exercise go to history under the new exercise
- [x] Progression state of the original is untouched
**Verification:** Manual; existing tests still pass
**Dependencies:** T14
**Files:** `frontend/src/components/SwapSheet.jsx`, `frontend/src/views/Workout.jsx`, `frontend/src/store/useStore.js`
**Scope:** M

## Checkpoint C: Utilities
- [x] Tests pass; plate calc + swap work in a real session

---

## Phase 3: Diet & Water

## Task 16: Nutrition state schema
**Description:** Add `nutrition: { targets, foodLog[], waterLog[], customFoods[] }` to user state, with store actions, export/import support and server sync.
**Acceptance criteria:**
- [x] Old state files load without errors (migration default)
- [x] JSON export/import round-trips nutrition data
**Verification:** `npm test` (new store/migration tests)
**Dependencies:** T2
**Files:** `frontend/src/store/useStore.js`, `frontend/src/lib/nutrition.js`, `frontend/src/lib/nutrition.test.js`
**Scope:** M

## Task 17: BMR/TDEE/macro calculator
**Description:** Mifflin-St Jeor BMR × activity factor, goal adjustment, protein-first macro split, water target (ml/kg).
**Acceptance criteria:**
- [x] Matches reference values for 3 test personas
- [x] Clamps to safe minimum calories
**Verification:** `npm test`
**Dependencies:** None
**Files:** `frontend/src/lib/tdee.js`, `frontend/src/lib/tdee.test.js`
**Scope:** XS

## Task 18: Water logging UI (Free)
**Description:** New Nutrition tab with a water ring, quick-add buttons and a daily goal.
**Acceptance criteria:**
- [x] One-tap +250 ml / custom; undo
- [x] Goal resets at local midnight
**Verification:** Manual; build succeeds
**Dependencies:** T16, T17
**Files:** `frontend/src/views/Nutrition.jsx`, `frontend/src/components/TabBar.jsx`, `frontend/src/App.jsx`
**Scope:** S

## Task 19: Manual food log + Open Food Facts search
**Description:** Search foods (OFF API + custom foods), pick a serving, and log to meals with daily macro totals against targets.
**Acceptance criteria:**
- [x] Search → add → totals update; edit and delete entries
- [x] Works offline for recent and custom foods
**Verification:** Manual; tests for macro summation
**Dependencies:** T16, T17
**Files:** `frontend/src/lib/foods.js`, `frontend/src/lib/foods.test.js`, `frontend/src/components/FoodSearch.jsx`, `frontend/src/views/Nutrition.jsx`
**Scope:** M

## Task 20: Barcode scanner (Superseded & Removed)
**Description:** Feature retired per user request in favor of pure AI Vision Meal Scanner powered by Google Gemini. All barcode UI buttons, modals, catalog lookups, and entitlement checks have been completely removed.
**Status:** Removed
**Scope:** S

## Task 21: Adaptive expenditure algorithm
**Description:** `estimateTdee(weights[], intakes[])` uses an EWMA-smoothed weight trend over 14–28 days and an energy-balance calc (≈7700 kcal/kg). It blends with the formula TDEE when data is sparse.
**Acceptance criteria:**
- [x] Synthetic data with known true TDEE is recovered within ±5%
- [x] Missing days are handled; no change suggested with fewer than 10 logged days
**Verification:** `npm test`
**Dependencies:** T16, T17
**Files:** `frontend/src/lib/adaptive-tdee.js`, `frontend/src/lib/adaptive-tdee.test.js`
**Scope:** M

## Task 22: Weekly adaptive check-in UI (Pro)
**Description:** Weekly card showing estimated TDEE, trend and proposed new targets. The user accepts or ignores.
**Acceptance criteria:**
- [x] Accepting updates targets; history of check-ins kept
**Verification:** Manual with seeded demo data
**Dependencies:** T21, T9
**Files:** `frontend/src/components/CheckIn.jsx`, `frontend/src/views/Nutrition.jsx`
**Scope:** S

## Task 23: AI meal-photo endpoint (Pro)
**Description:** `POST /api/meal-photo` takes a downscaled image and returns `{items:[{name, grams, kcal, p, c, f, confidence}]}` via the vision LLM. Has a schema-validated response, a per-user daily quota and Pro checks.
**Acceptance criteria:**
- [x] Response validated against the schema; malformed LLM output → 502 with a safe message
- [x] Free user → 402; quota exceeded → 429
**Verification:** API tests with a mocked provider
**Dependencies:** T10
**Files:** `api/ai/meal-photo.js`, `api/ai/schema.js`, `api/server.js`, `api/test/meal-photo.test.js`
**Scope:** M

## Task 24: AI meal-photo UI
**Description:** Camera capture → loading → editable item list → log to meal.
**Acceptance criteria:**
- [x] User can adjust grams or remove items before logging
- [x] Image is never stored server-side unless the user opts in
**Verification:** Manual on device
**Dependencies:** T23, T19
**Files:** `frontend/src/components/MealPhoto.jsx`, `frontend/src/views/Nutrition.jsx`, `frontend/src/lib/api.js`
**Scope:** M

## Task 40: Gemini adapter for the AI Coach
**Description:** The Coach currently drives only the Claude Agent SDK and Codex CLI
(`api/coach/config.js` `PROVIDERS`). Add `api/coach/adapters/gemini.js` using a Gemini API key
(Flash model) with structured JSON output validated by the existing zod schemas, plus a `PROVIDERS` row.
**Acceptance criteria:**
- [x] Intake → plan and plan review work end-to-end with `provider: 'gemini'`
- [x] Existing coach tests pass; new adapter tests use a mocked HTTP client
**Verification:** `cd api && npm test`; manual Coach run with a real key
**Dependencies:** T2
**Files:** `api/coach/adapters/gemini.js`, `api/coach/adapters/index.js`, `api/coach/config.js`, `api/test/coach-gemini.test.js`
**Scope:** M

## Checkpoint D: Diet tracker
- [ ] Log water, food (search/barcode/photo); weekly check-in proposes targets
- [ ] Tests pass; **review with you**

---

## Phase 4: Health Integration & Recovery

## Task 25: Health adapter interface
**Description:** `lib/health.js` with `requestPermissions`, `readWeights`, `readActiveEnergy`, `readSteps`, `readSleep`. No-op on web.
**Acceptance criteria:**
- [x] Unit-tested normalization (units, dedupe by timestamp)
**Verification:** `npm test`
**Dependencies:** T2
**Files:** `frontend/src/lib/health.js`, `frontend/src/lib/health.test.js`
**Scope:** S

## Task 26: iOS HealthKit adapter
**Description:** Wire a HealthKit Capacitor plugin with read-only scopes and Info.plist usage strings.
**Acceptance criteria:**
- [ ] Weight, energy, steps and sleep read on a real iPhone
**Verification:** Manual on device (needs Mac + Xcode)
**Dependencies:** T25
**Files:** `frontend/src/lib/health.js`, `frontend/ios/App/App/Info.plist`, entitlements file
**Scope:** S

## Task 27: Android Health Connect adapter
**Description:** Health Connect plugin, manifest permissions and the privacy-policy activity.
**Acceptance criteria:**
- [ ] Same four data types read on an Android device
**Verification:** Manual on device
**Dependencies:** T25
**Files:** `frontend/src/lib/health.js`, `frontend/android/app/src/main/AndroidManifest.xml`
**Scope:** S

## Task 28: Use synced data
**Description:** Background/foreground sync merges health weights into the weight chart and feeds active energy into the adaptive TDEE.
**Acceptance criteria:**
- [x] No duplicate weigh-ins; manual entries win on conflict
- [x] Gated as Pro auto-sync
**Verification:** Tests for merge; manual
**Dependencies:** T26 or T27, T21
**Files:** `frontend/src/lib/health-sync.js`, `frontend/src/lib/health-sync.test.js`, `frontend/src/store/useStore.js`
**Scope:** M

## Task 29: Muscle recovery model
**Description:** Per-muscle fatigue from recent sets (volume × effort, via `muscles.js` weights) with exponential decay. Sleep modifies the recovery rate.
**Acceptance criteria:**
- [x] Heavy leg day → quads below 50% recovered at 24 h, near full at ~72 h
- [x] Works without sleep data
**Verification:** `npm test`
**Dependencies:** T2 (T28 optional for sleep)
**Files:** `frontend/src/lib/recovery.js`, `frontend/src/lib/recovery.test.js`
**Scope:** M

## Task 30: Recovery overlay (Pro)
**Description:** BodyMap mode coloring muscles by recovery %, shown on Home before today's workout.
**Acceptance criteria:**
- [x] Toggle between Volume and Recovery views
**Verification:** Manual; build
**Dependencies:** T29, T9
**Files:** `frontend/src/components/BodyMap.jsx`, `frontend/src/views/Home.jsx`, `frontend/src/views/Stats.jsx`
**Scope:** S

## Checkpoint E: Health
- [x] Device sync works on at least one platform; recovery map believable
- [x] **Review with you**

---

## Phase 5: Lock-screen Rest Timer

## Task 31: Android ongoing rest-timer notification
**Description:** Ongoing notification with a chronometer countdown and a "+30s / Skip" action while resting.
**Acceptance criteria:**
- [ ] Timer visible on the lock screen with the app backgrounded; cleared at workout end
**Verification:** Manual on device
**Dependencies:** T3
**Files:** `frontend/src/lib/mobile.js`, `frontend/src/components/RestTimer.jsx`, small native plugin in `frontend/android/`
**Scope:** M

## Task 32: iOS Live Activity widget
**Description:** SwiftUI widget extension (ActivityKit) rendering the rest countdown and the next set.
**Acceptance criteria:**
- [ ] Shows on the lock screen and Dynamic Island in the simulator
**Verification:** Xcode run
**Dependencies:** T3
**Files:** `frontend/ios/App/RestTimerWidget/*`
**Scope:** M

## Task 33: Live Activity bridge
**Description:** Capacitor plugin with start/update/end methods, called from `RestTimer.jsx`.
**Acceptance criteria:**
- [ ] Starting rest in the app starts the Live Activity; finishing the workout ends it
**Verification:** Manual on iPhone
**Dependencies:** T32
**Files:** `frontend/ios/App/App/LiveActivityPlugin.swift`, `frontend/src/lib/mobile.js`, `frontend/src/components/RestTimer.jsx`
**Scope:** M

## Checkpoint F: Live timers
- [ ] Lock-screen timers work on both platforms

---

## Phase 6: Gamification

## Task 34: Streaks
**Description:** `computeStreaks(history, plan, nutrition)` covers workout streaks (counting scheduled days only), hydration streak and macro streak.
**Acceptance criteria:**
- [x] Rest days in the plan don't break workout streaks
**Verification:** `npm test`
**Dependencies:** T16
**Files:** `frontend/src/lib/streaks.js`, `frontend/src/lib/streaks.test.js`
**Scope:** S

## Task 35: Multi-metric heatmap
**Description:** Extend `Heatmap.jsx` with a metric switch (Training / Water goal / Macros hit) and a streak badge.
**Acceptance criteria:**
- [x] Existing training heatmap output unchanged by default
**Verification:** Manual; build
**Dependencies:** T34
**Files:** `frontend/src/components/Heatmap.jsx`, `frontend/src/views/Stats.jsx`
**Scope:** S

## Task 36: PR share cards
**Description:** On PR detection, offer a branded 1080×1920 card rendered to canvas and shared via `@capacitor/share`.
**Acceptance criteria:**
- [x] Card shows exercise, weight × reps, e1RM, date and app branding
- [x] Share sheet opens with the PNG on Android and iOS
**Verification:** Manual
**Dependencies:** T3
**Files:** `frontend/src/lib/share-card.js`, `frontend/src/components/PrShareSheet.jsx`, `frontend/src/views/Workout.jsx`
**Scope:** M

## Checkpoint G: Gamification
- [x] Tests pass; **review with you**

---

## Phase 7: Launch Readiness

## Task 37: Privacy & store compliance
**Description:** Privacy policy, health-data disclosures, Play Data Safety and App Privacy labels, in-app account deletion.
**Acceptance criteria:**
- [x] Delete account is reachable in Settings and calls the T6 endpoint
**Verification:** Manual checklist
**Dependencies:** T6, T26/T27
**Files:** `docs/PRIVACY.md`, `frontend/src/views/Settings.jsx`
**Scope:** S

## Task 38: AGPL source release
**Description:** Public repo/tag per released build, with an in-app "Source code" link.
**Acceptance criteria:**
- [ ] Every store build maps to a public commit
**Verification:** Manual
**Dependencies:** T1
**Files:** `.github/workflows/*`, `frontend/src/views/Settings.jsx`
**Scope:** S

## Task 39: Store listings & beta
**Description:** Screenshots, descriptions, TestFlight + Play internal track.
**Acceptance criteria:**
- [ ] Beta builds installable by testers
**Verification:** Manual
**Dependencies:** All previous checkpoints
**Files:** store consoles; `docs/RELEASE.md`
**Scope:** S

## Checkpoint H: Ready to submit
- [ ] All acceptance criteria met; **final review with you**
