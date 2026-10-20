# Licensing & Compliance Decision

**Date:** 2026-10-19  
**Status:** Approved for implementation (Pending final legal counsel review)

---

## 1. Context & Objectives

The goal is to commercialize a mobile fitness application derived from the upstream project `alexpcosta/opengym`. The app targets the Apple App Store, Google Play Store, and web PWA, featuring:
- Free local workout tracking.
- Paid subscription tier (Pro) for AI coaching, nutrition/water tracking, barcode scanning, deep recovery analytics, and multi-device cloud sync.

This document records the legal analysis, obligations, risk assessments, and operational decisions regarding openGym's licensing, app store distribution, and exercise media assets.

---

## 2. Core Codebase License: GNU AGPL v3.0

### Obligations
The upstream repository `alexpcosta/opengym` is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.
- **Copyleft Scope:** Any modifications, extensions, or combined works distributed or made available over a network (SaaS/API interaction) must make their corresponding source code available under AGPL-3.0.
- **Network Trigger (Section 13):** If a user interacts with the application remotely through a computer network (e.g., hosted sync API, AI Coach endpoints), the provider must offer access to the Corresponding Source to all users without charge.

### Decision & Commercial Strategy
We will **proceed under AGPL-3.0 and publish the modified client and server source code**:
1. **Public Source Release (Task 38):** Maintain a public GitHub repository mirroring releases tagged to each production mobile and web build, complete with build instructions.
2. **Monetization Moat:** Monetize hosted backend infrastructure, account sync, managed AI endpoints (Gemini vision/coaching), branded community, and turn-key convenience—not the client code exclusivity.
3. **Proprietary Boundaries:** Cloud infrastructure, payment gateway webhooks (RevenueCat integration), proprietary AI prompts/models hosted on proprietary servers, and third-party API keys remain external services governed by separate API terms.

---

## 3. App Store Distribution & The Section 7 Exception

### The Conflict
Standard AGPL-3.0 terms contain clauses (e.g., prohibition of further restrictions in Section 10) that conflict with Apple App Store and Google Play distribution agreements (DRM, non-transferability, platform restrictions).

### Upstream Exception in `NOTICE.md`
`openGym` includes an explicit Section 7 additional permission in `NOTICE.md`:
> *"As an additional permission under section 7 of the AGPL v3.0, the copyright holder permits distribution of the openGym mobile application through app store platforms (such as the Apple App Store and Google Play) whose terms of service would otherwise be incompatible with the AGPL, provided the corresponding source code remains available under the AGPL at the project repository. This permission applies to the distribution channel only and does not otherwise limit the license."*

### Decision & Action Items
- **Validity for Forks:** Under AGPL Section 7, additional permissions granted by copyright holders travel with the code, provided we preserve the permission text and fulfill its condition (making corresponding source available at a public repository).
- **Attribution:** Preserve full attribution to Duarte Santos / upstream openGym in `NOTICE.md`, the in-app "About / Settings" screen, and repository documentation.
- **Outreach:** Send a formal courtesy notice / clarification inquiry to the upstream copyright holder to confirm mutual understanding that the exception extends to commercial forks maintaining full public AGPL source access.

---

## 4. Exercise Data & Media (`hasaneyldrm/exercises-dataset`)

### Analysis
- **Data (Names, Target Muscles, Instructions):** Distributed within `frontend/src/lib/exercises-data.js` and `frontend/src/instr/`.
- **Media (GIFs / Images):** The repository does **not** bundle the media files directly; they are dynamically fetched at runtime/build-time from upstream storage.
- **License Terms:** The exercise images and animations come from `hasaneyldrm/exercises-dataset` (scraped from open web fitness resources) and are **not** covered by AGPL-3.0. Commercial redistribution of these media files carries copyright infringement risk if scraped media contains uncredited proprietary demonstrations.

### Decision
1. **Short-Term (MVP & Beta Testing):**
   - Follow upstream's architecture: do not bundle media into store binaries. Fetch on-demand or use vector/schematic muscle maps (`MuscleMap` MIT-licensed paths in `body-paths.js`).
2. **Medium-Term (Commercial Launch):**
   - Audit exercise media assets. Transition to verified royalty-free or licensed 3D/video demonstration assets (e.g., custom SVG animations or commercially licensed exercise catalogs).
   - Ensure all textual instructions and exercise metadata maintain appropriate disclaimers and attribution.

---

## 5. Summary Matrix & Action Plan

| Asset / Component | Current License | Commercial Risk | Strategy / Action |
|---|---|---|---|
| **openGym Frontend & API** | AGPL-3.0 | Low (if public) / High (if closed) | Publish all frontend and API code under AGPL-3.0 with in-app source link. |
| **App Store Distribution** | Section 7 Exception | Low | Comply with source disclosure; preserve `NOTICE.md`. |
| **MuscleMap Geometry** | MIT License | Very Low | Keep copyright & MIT notice in `NOTICE.md`. |
| **Exercise Media (GIFs)** | Third-party / Unclear | Medium-High | On-demand fetch during beta; replace with licensed assets for scale. |
| **Open Food Facts** | ODbL 1.0 | Low | Attribute Open Food Facts in nutrition search UI; follow database share-alike rules. |

---

*Decision ratified for Phase 0 completion.*
