# BlooRush Partner Mobile App & Real-Time Admin Sync — Final Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and compile the standalone **BlooRush Partner Android Mobile App** (`com.bloorush.partner`), ensure real-time synchronization between Customer Mobile App, Partner Mobile App, and the Web-Only Admin Panel via Cloud Firestore, and configure automated GitHub Actions CI/CD to output both APKs.

**Architecture:** A 3-tier ecosystem powered by Google Cloud Firestore. Customer bookings trigger real-time onSnapshot events to the Web Admin Panel; Admin assignments trigger instant push events to the assigned Partner Mobile App; Partner job progression (Arrived ➔ Started ➔ Completed) reflects instantly across Admin and Customer Live Trackers.

**Tech Stack:** Capacitor 8.x, Vanilla JS, CSS3, HTML5, Firebase Auth, Cloud Firestore, Android Gradle (Java 21), GitHub Actions CI/CD.

**Spec Reference:** [`docs/Final_architecture.md`](file:///C:/Users/hp/Documents/Bloorush_App/docs/Final_architecture.md)

---

## Global Constraints & Principles

- **Dual-App Separation**: Customer App (`com.bloorush.customer`) and Partner App (`com.bloorush.partner`) must have distinct package IDs so both can be installed simultaneously on any Android phone.
- **Admin Panel Web-Only**: `admin.html` and `admin.js` must be strictly excluded from both mobile app bundles for security and compactness.
- **Java 21 Compatibility**: GitHub Actions Android CI must use Java 21 (`temurin` 21) due to Android Gradle Plugin 8.13.0 requirements.
- **Non-Interactive CI**: Always use `npx --yes cap ...` in automated build scripts.
- **Real-Time Data Source**: Both mobile apps and the web admin panel must share the exact same Firebase project (`mvp-bloorush`) and Firestore collections (`jobs`, `slots`, `partners`, `attendance`).

---

## File Structure & Changes

- **Create**:
  - `scripts/build-partner.js` — Bundles partner web assets (`partner.html`, `partner.js`, `data.js`, `styles.css`, `mobile-bridge.js`) into `www-partner/` while strictly excluding admin files.
  - `capacitor.partner.json` — Capacitor configuration for Partner App (`appId: "com.bloorush.partner"`, `appName: "BlooRush Partner"`, `webDir: "www-partner"`).
  - `docs/Final_architecture.md` — Final Architecture Specification.
  - `docs/Final_implemantation.md` — This file.
- **Modify**:
  - `.gitignore` — Ensure `*.apk` and temporary build directories are ignored to prevent repo bloat.
  - `partner-test/partner.html` — Update asset script tags for native bundling compatibility.
  - `partner-test/partner.js` — Connect native haptic vibration and geolocation from `mobile-bridge.js`.
  - `.github/workflows/build-mobile.yml` — Add `build-partner-android` CI/CD job to compile and upload `BlooRush-Partner-APK`.

---

## Detailed Task Breakdown

### Task 1: Environment & .gitignore Optimization

**Files:**
- Modify: `.gitignore`

**Interfaces:**
- Keeps local git tree clean; ignores binary APKs (`*.apk`), `www-partner/`, and build folders.

- [ ] **Step 1: Update `.gitignore`**
  Add `*.apk`, `www-partner/`, and `android-partner/app/build/` to `.gitignore`.
- [ ] **Step 2: Verify git status**
  Run `git status` to ensure `bloorush_1.0.apk` is no longer marked as untracked.
- [ ] **Step 3: Commit**
  `git commit -m "chore: ignore apk binaries and partner build artifacts in git"`

---

### Task 2: Partner Asset Bundling & Bridge Linking

**Files:**
- Create: `scripts/build-partner.js`
- Modify: `partner-test/partner.html`
- Modify: `partner-test/partner.js`

**Interfaces:**
- Consumes: `partner-test/*`, `mobile-bridge.js`
- Produces: Clean, self-contained `www-partner/` directory with `index.html` as entrypoint.
- Native Bridge: Invokes `window.BlooRushNative.hapticImpact()` on service timer warnings and status button taps.

- [ ] **Step 1: Create `scripts/build-partner.js`**
  Implement Node script to:
  1. Clean and create `www-partner/`.
  2. Copy `partner-test/partner.html` as `www-partner/index.html` (re-pointing `<script src="../mobile-bridge.js">` to `mobile-bridge.js`).
  3. Copy `partner-test/partner.js`, `partner-test/data.js`, `partner-test/styles.css`.
  4. Copy `mobile-bridge.js` into `www-partner/`.
  5. Strictly exclude `admin.html` and `admin.js`.
- [ ] **Step 2: Enhance `partner-test/partner.js` with native haptics**
  Update `vibrate()` to call `window.BlooRushNative.hapticImpact()` if running inside Capacitor native container.
- [ ] **Step 3: Test asset build locally**
  Run: `node scripts/build-partner.js`
  Verify `www-partner/index.html` exists and contains valid references.
- [ ] **Step 4: Commit**
  `git commit -m "feat: add partner build script and native bridge hook"`

---

### Task 3: Partner Capacitor Configuration & Android Container Setup

**Files:**
- Create: `capacitor.partner.json`
- Target: `android-partner/`

**Interfaces:**
- Consumes: `www-partner/`
- Produces: `android-partner` native Android project with `applicationId = "com.bloorush.partner"` and `app_name = "BlooRush Partner"`.

- [ ] **Step 1: Create `capacitor.partner.json`**
  Configure `appId: "com.bloorush.partner"`, `appName: "BlooRush Partner"`, `webDir: "www-partner"`, androidScheme `https`.
- [ ] **Step 2: Generate native Android partner container**
  Create `android-partner/` native container using Capacitor CLI configured for `capacitor.partner.json`.
- [ ] **Step 3: Update `AndroidManifest.xml` & `strings.xml` for Partner**
  Ensure permissions (Fine Location, Coarse Location, Haptics, Internet) and display name ("BlooRush Partner").
- [ ] **Step 4: Commit**
  `git commit -m "feat: configure partner capacitor project and native android container"`

---

### Task 4: GitHub Actions CI/CD Pipeline Update

**Files:**
- Modify: `.github/workflows/build-mobile.yml`

**Interfaces:**
- Automates cloud compilation of both:
  1. `BlooRush-Android-APK` (`bloorush_customer.apk`)
  2. `BlooRush-Partner-APK` (`bloorush_partner.apk`)

- [ ] **Step 1: Add Partner compilation step in `.github/workflows/build-mobile.yml`**
  Add build steps to:
  - Run `node scripts/build-partner.js`
  - Sync partner assets
  - Build partner debug APK via `./gradlew assembleDebug`
  - Upload `BlooRush-Partner-APK` artifact.
- [ ] **Step 2: Verify YAML syntax and workflow logic**
- [ ] **Step 3: Commit and push to GitHub**
  `git push origin main`

---

### Task 5: Cloud Build Verification & APK Download

**Files:**
- Output: `bloorush_partner.apk` in workspace root.

**Interfaces:**
- Consumes: GitHub Actions run artifacts.
- Produces: Verified Android `.apk` file for testing on physical phone or emulator.

- [ ] **Step 1: Monitor GitHub Actions run**
  Watch workflow execution to ensure both Android builds compile cleanly without errors.
- [ ] **Step 2: Download Partner APK**
  Fetch `bloorush_partner.apk` into workspace root.
- [ ] **Step 3: Update Project Manager Log**
  Log milestones and verification in [`docs/PROJECT_REPORT.md`](file:///C:/Users/hp/Documents/Bloorush_App/docs/PROJECT_REPORT.md).
