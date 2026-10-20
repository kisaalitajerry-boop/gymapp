# Implementation Plan: Commercial Fitness App on openGym

## Overview
Fork `alexpcosta/opengym` (React 19 + Vite + Zustand frontend, framework-less Node API,
Capacitor iOS/Android shells) into a monetized mobile app. We add an onboarding survey,
a tiered paywall, workout utilities, a diet and water tracker, health-platform sync, lock-screen
rest timers and shareable gamification. All of it builds on openGym's existing workout,
progression, 1RM, heatmap and muscle-map code.

## What the codebase actually gives us (verified 2026-10-19)
| Claim | Reality in repo |
|---|---|
| 5,600+ exercises | **1,324** in `frontend/src/lib/exercises-data.js` (`EXDB`) |
| Muscle recovery / fatigue analytics | **Not present.** `BodyMap.jsx` + `lib/muscles.js` shade *volume* only. Recovery must be built |
| Progression (Linear, Greyskull, double) | Present: `lib/progression.js` (+ tests) |
| RIR/RPE, supersets, timed sets | Present: `lib/effort.js`, `views/Workout.jsx` |
| PR detection, 1RM | Present: `lib/onerm.js`, `lib/history.js` |
| Heatmap | Present: `components/Heatmap.jsx` (training time only) |
| Mobile app | Capacitor 7 (`frontend/android`, `frontend/ios`), local-only data mode |
| Backend | `api/server.js` with **JSON files on disk**, passkey auth. Not multi-tenant SaaS |
| Plate calculator | On upstream roadmap, **not built** |

Exercise metadata per entry: `bp` (body part), `eq` (equipment), `tg` (target),
`mg`, `sm` (secondary muscles). That's enough to build substitution.

## Architecture Decisions (proposed, pending your approval)
- **Local-first mobile app + hosted API.** Keep the Capacitor app's on-device data mode
  as the source of truth. Add a hosted API for accounts, sync, entitlements and AI calls.
  This reuses the existing mobile build path instead of rewriting.
- **Storage: put a storage-adapter interface in front of the JSON files, then add Postgres.**
  JSON-on-disk won't scale to many paying users. An adapter keeps upstream merges cheap.
- **Payments: RevenueCat** (`@revenuecat/purchases-capacitor`). Apple and Google require in-app
  purchase for digital subscriptions. RevenueCat handles receipts, restores and webhooks.
- **Entitlements are a single pure module** (`lib/entitlements.js`, `canUse(feature)`) so
  every paywalled feature checks in one place, and the logic can be tested.
- **Food data: Open Food Facts** (free, ODbL) for barcode and text search. The AI photo
  feature calls a vision LLM **from our API only**, never from the client with a key.
- **Health: Capacitor plugins** for HealthKit and Health Connect behind one
  `lib/health.js` adapter, so the rest of the app is platform-agnostic.
- **New training logic lives as pure functions in `frontend/src/lib/` with Vitest tests**,
  matching the repo's existing convention (`npm test` in `frontend/`).

## Dependency Graph
```
Licensing check ─┐
Dev env baseline ┴─► Rebrand ─► Entitlements lib ─► RevenueCat ─► Paywall UI ─► Onboarding survey
                                      │                                             │
                                      ├─► Plate calc / Substitution (free utilities)│
                                      │                                             ▼
                                      ├─► Nutrition data model ─► TDEE calc ─► Water / Food log
                                      │        │                     │              │
                                      │        │                     └─► Adaptive TDEE ◄─┐
                                      │        └─► Barcode ─► AI photo (needs API)        │
Storage adapter ─► Postgres ─► Accounts ─► Entitlement webhook ─► AI photo endpoint       │
                                      └─► Health adapter ─► HealthKit / Health Connect ───┘
                                                         └─► Recovery model ─► BodyMap UI
                                      Rest timer ─► Android ongoing notif / iOS Live Activity
                                      PR detection ─► Share cards;  Heatmap ─► Multi-metric heatmap
```

## Task List (details in `tasks/todo.md`)

### Phase 0: Foundation & De-risking
- [x] T1: Licensing & compliance audit (AGPL, exercise media, app-store exception)
- [x] T2: Local dev baseline (frontend dev server, API, tests green)
- [x] T3: Rebrand (name, bundle IDs, icons, splash)
- [x] T4: Storage adapter interface over existing JSON store
- [x] T5: Postgres storage adapter + migration script
- [x] T6: Hosted accounts (Sign in with Apple / Google + existing passkeys + delete endpoint)

### Checkpoint A: Foundation

### Phase 1: Monetization (riskiest, so it goes first)
- [x] T7: Entitlements module + tier matrix
- [x] T8: RevenueCat purchase + restore in Capacitor
- [x] T9: Paywall screen + `<ProGate>` component
- [x] T10: Server-side entitlement sync (RevenueCat webhook)
- [x] T11: Onboarding survey → starter plan + nutrition targets

### Checkpoint B: A user can onboard, hit the paywall, subscribe, and unlock Pro

### Phase 2: Workout Utilities
- [x] T12: Plate calculator logic
- [x] T13: Plate calculator popup in Workout
- [x] T14: Exercise substitution ranking logic
- [x] T15: Swap-exercise sheet in Workout

### Checkpoint C: Utilities

### Phase 3: Diet & Water
- [x] T16: Nutrition/water state schema + store actions
- [x] T17: BMR/TDEE/macro calculator
- [x] T18: Water logging UI (Free)
- [x] T19: Manual food log + Open Food Facts search
- [x] T20: [Removed] Barcode scanner (completely retired per user request in favor of pure Gemini AI meal photo scanner)
- [x] T21: Adaptive expenditure algorithm
- [x] T22: Weekly adaptive check-in UI (Pro)
- [x] T23: AI meal-photo API endpoint (Pro, rate-limited, Gemini Flash)
- [x] T24: AI meal-photo capture + review UI
- [x] T40: Gemini API adapter for the AI Coach (`api/coach/adapters/gemini.js`)

### Checkpoint D: Diet tracker end-to-end

### Phase 4: Health Integration & Recovery
- [x] T25: Health adapter interface + web/no-op impl
- [ ] T26: iOS HealthKit adapter *(deferred: iOS later)*
- [ ] T27: Android Health Connect adapter
- [x] T28: Feed synced weight/energy into weight chart + adaptive TDEE
- [x] T29: Muscle recovery model (volume + time + sleep)
- [x] T30: Recovery overlay on BodyMap (Pro)

### Checkpoint E: Health sync

### Phase 5: Lock-screen Rest Timer
- [ ] T31: Android ongoing rest-timer notification
- [ ] T32: iOS Live Activity widget extension *(deferred: iOS later)*
- [ ] T33: Capacitor bridge to start/update/end Live Activity *(deferred: iOS later)*

### Checkpoint F: Live timers

### Phase 6: Gamification
- [x] T34: Streak computation
- [x] T35: Multi-metric heatmap (workouts / water / macros)
- [x] T36: PR share-card renderer + share sheet

### Checkpoint G: Gamification

### Phase 7: Launch Readiness
- [x] T37: Privacy policy, health-data disclosures, in-app account deletion
- [ ] T38: Public AGPL source release pipeline
- [ ] T39: Store listings + TestFlight / Play internal testing

### Checkpoint H: Ready to submit

## Parallelization
- After T7: Phase 2, T16–T19, T25 and T34–T35 are independent and can run in parallel.
- Sequential: T4→T5→T6→T10, T16→T21→T22, T25→T26/T27→T28.
- Contract-first: define the AI photo response schema (T23) before T24 UI.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| **AGPL-3.0**: a network-served modified version must publish its source. Competitors can clone your Pro features for free | High | Accept (monetize service, sync, AI and brand), or keep proprietary pieces as separate server-side services. **Get legal advice** (T1) |
| Exercise GIFs/images (hasaneyldrm dataset) may not permit commercial redistribution | High | Verify in T1; budget for a licensed dataset or your own media if not |
| App-store exception in NOTICE.md is granted by the upstream copyright holder. Confirm it covers your fork | Med | T1; contact upstream author if unclear |
| Apple requires Sign in with Apple if other social logins exist, plus in-app account deletion | Med | Built into T6 / T37 |
| Health data triggers stricter App Store / Play review + privacy rules | Med | Read-only scopes, clear disclosures (T37) |
| AI photo costs per call | Med | Pro-only, per-user daily quota, image downscaling (T23) |
| iOS Live Activities need native Swift + a Mac/Xcode | Med | Isolate in T32–T33; ship Android first |
| AI Coach today runs on **Claude Code setup tokens / ChatGPT device sign-in**: personal subscription credentials, not meant to power a commercial multi-user service | High | T40: add a Gemini API-key adapter before enabling the Coach for paying users |
| Diverging from upstream makes merges painful | Low | Additive modules, adapters, minimal edits to core files |

## Decisions (2026-10-19)
1. **Backend:** extend `api/` with Postgres via plain `pg` (no ORM, matching the repo's minimal-dependency style).
2. **License:** proceed under AGPL-3.0 and publish source. Monetize hosted sync, AI, convenience and brand. A closed-source route would need a commercial license from the upstream author.
3. **Platforms:** Android + PWA first. iOS-native tasks (T26, T32, T33) are deferred.
4. **AI provider:** Google Gemini Flash for meal photos (T23) and a new Coach adapter (T40).
5. **Free tier:** workout logging, default starter plans (PPL, 5×5), manual water tracking, basic exercise search.
   **Pro:** survey-generated programs, advanced macro/diet tracking, barcode, AI meal photo, deep analytics (volume/PR/1RM trends), recovery map, health auto-sync.
6. **Extras kept:** self-hosting (open-source tier), web PWA, AI Coach (Pro in the hosted app).

## Open Questions
- App name / brand for T3 rebrand (also sets the Android application ID, e.g. `com.yourbrand.app`).
