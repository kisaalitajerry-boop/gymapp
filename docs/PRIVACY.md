# Privacy Policy for MuscleTrack / openGym Commercial Fork

*Last updated: October 20, 2026*

MuscleTrack ("we", "our", or "the App") is committed to protecting your privacy. This document outlines our data collection, local storage architecture, third-party integrations, and user data rights in compliance with Apple App Store Review Guidelines (Guideline 5.1.1) and Google Play Developer Program Policies.

---

## 1. Core Architecture: Local-First Privacy

1. **Guest Mode & Local Storage**:
   - By default, all logged workouts, routines, weight logs, nutrition tracking, and preferences reside solely on your device in local storage / IndexedDB.
   - We do not track, profile, or sell your local training data.

2. **Hosted Accounts & Sync (Optional)**:
   - When you create an account (via Passkey, Google, or Apple), your training state is backed up to our encrypted API server to enable cross-device sync.
   - You can export your entire data history at any time in open JSON format (`Settings → Export backup`).

---

## 2. Health & Sensor Data

1. **Apple HealthKit & Android Health Connect**:
   - MuscleTrack accesses health platforms strictly on a read-only basis for body weight and active energy burned.
   - We **never** write, overwrite, or delete records in your device's health database without explicit permission.
   - Health data is never sold, shared with advertising brokers, or used for automated marketing.

2. **Camera & Meal Photos**:
   - The AI meal recognition feature utilizes camera capture only upon user initiation.
   - Image data is downscaled and transmitted securely via HTTPS to our vision processor solely for estimating food items and macronutrients.
   - Meal images are never permanently retained or stored on our servers.

---

## 3. Account & Data Deletion (App Store & Play Compliance)

Under Apple App Store Guideline 5.1.1(v) and Google Play account deletion policy:
- **In-App Deletion**: You can permanently delete your account and all associated cloud data directly inside the App by visiting:
  `Settings → Account → Delete account & cloud data`.
- **Immediate Effect**: Upon confirmation, your cloud credentials, push subscriptions, user profile, and synchronized training logs are permanently purged from our database immediately.
- **Local Data Reset**: You can wipe all local on-device logs at any time via `Settings → Data → Reset everything`.

---

## 4. Subscriptions & Billing

- In-app subscriptions are processed directly through the Apple App Store, Google Play Store, and RevenueCat.
- We never receive, process, or store your raw payment details or credit card numbers.

---

## 5. Contact & Support

For privacy inquiries, GDPR data requests, or support:
- Email: `privacy@muscletrack.app`
- GitHub Repository: [https://github.com/alexpcosta/opengym](https://github.com/alexpcosta/opengym)
