# BlooRush Mobile App — Complete Build Phases & Timeline

This document provides a comprehensive, step-by-step roadmap for building, packaging, and deploying the **BlooRush** mobile application for both **Android** (built locally on Windows) and **iOS** (built via Cloud CI/CD without needing a physical Mac).

---

## 📅 Timeline Summary

| Phase | Description | Environment | Estimated Time |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Project Setup & Capacitor Initialization | Windows PC | 4 Hours |
| **Phase 2** | Viewport & Mobile Safe-Area UI Adaptations | Windows PC | 1 Day |
| **Phase 3** | Native Plugins Integration (GPS, Push, Haptics) | Windows PC | 1 Day |
| **Phase 4** | Android Local Build (`.apk` Generation) | Windows PC (Android Studio) | 1 Day |
| **Phase 5** | iOS Cloud Build Pipeline (GitHub Actions) | Cloud (Mac Runner) | 4 Hours |
| **Phase 6** | End-to-End Testing & Verification | Android & iOS Devices | 1 Day |

---

## 🛠️ Phase-by-Phase Build Guide

### **Phase 1: Project Setup & Capacitor Initialization**
**Goal**: Prepare the codebase and install Capacitor dependencies on Windows.

#### Steps & Commands:
1. **Install Core Dependencies**:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
   ```
2. **Initialize Capacitor Config**:
   ```bash
   npx cap init BlooRush com.bloorush.app --web-dir=.
   ```
3. **Verify Configuration (`capacitor.config.json`)**:
   ```json
   {
     "appId": "com.bloorush.app",
     "appName": "BlooRush",
     "webDir": ".",
     "bundledWebRuntime": false
   }
   ```

---

### **Phase 2: Mobile Viewport & Safe-Area UI Adaptations**
**Goal**: Ensure `index.html` (Customer) and `partner-test/partner.html` (Partner) fit mobile screens, notch cutouts, and status bars seamlessly.

#### Steps:
1. **Update Viewport Metadata**:
   In `index.html` and `partner-test/partner.html`, update the `<meta viewport>`:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no" />
   ```
2. **Apply CSS Safe-Area Insets**:
   Add to `styles.css` / header style tags:
   ```css
   body {
     padding-top: env(safe-area-inset-top);
     padding-bottom: env(safe-area-inset-bottom);
     touch-action: manipulation;
     -webkit-tap-highlight-color: transparent;
   }
   ```
3. **Fix Keyboard Layout Overlaps**:
   Configure input fields so mobile keyboards don't hide form action buttons.

---

### **Phase 3: Native Hardware & Service Plugins Integration**
**Goal**: Connect JavaScript UI to native mobile capabilities.

#### Steps & Commands:
1. **Install Capacitor Plugins**:
   ```bash
   npm install @capacitor/geolocation @capacitor/push-notifications @capacitor/status-bar @capacitor/keyboard @capacitor/haptics @capacitor/device
   ```
2. **Plugin Implementations**:
   * **GPS Location**: Used by partners during job check-in (`Geolocation.getCurrentPosition()`).
   * **Push Notifications**: Triggered by Firebase Cloud Messaging when new jobs are assigned.
   * **Haptics**: Tactile button vibration feedback (`Haptics.vibrate()`).

---

### **Phase 4: Android Local Build (`.apk` Generation on Windows)**
**Goal**: Build the Android app package on your Windows PC.

#### Steps & Commands:
1. **Add Android Target Platform**:
   ```bash
   npx cap add android
   ```
2. **Sync Web Code & Plugins into Android**:
   ```bash
   npx cap sync android
   ```
3. **Open Android Studio & Generate APK**:
   ```bash
   npx cap open android
   ```
   * Or build directly via command line:
     ```bash
     cd android && ./gradlew assembleDebug
     ```
4. **Output Location**:
   The generated Android test APK will be located at:
   `android/app/build/outputs/apk/debug/app-debug.apk`

---

### **Phase 5: iOS Cloud Build Pipeline (GitHub Actions - No Mac Needed)**
**Goal**: Build the iOS application package automatically in the cloud using a free GitHub Actions Mac runner.

#### Steps:
1. Create file `.github/workflows/ios-build.yml` in your repository:
   ```yaml
   name: Build iOS App

   on:
     push:
       branches: [ main ]

   jobs:
     build-ios:
       runs-on: macos-latest
       steps:
         - uses: actions/checkout@v3

         - name: Setup Node.js
           uses: actions/setup-node@v3
           with:
             node-version: 18

         - name: Install Dependencies
           run: npm install

         - name: Add iOS Platform & Sync
           run: |
             npx cap add ios
             npx cap sync ios

         - name: Build iOS App (Archive)
           run: |
             cd ios/App
             xcodebuild -workspace App.xcworkspace -scheme App -sdk iphoneos -configuration Release -derivedDataPath build CODE_SIGNING_ALLOWED=NO

         - name: Upload iOS Artifact
           uses: actions/upload-artifact@v3
           with:
             name: BlooRush-iOS-Build
             path: ios/App/build/Build/Products/Release-iphoneos/App.app
   ```
2. **How to run**: Push your code to GitHub ➔ GitHub Actions compiles the iOS app on a cloud Mac ➔ Download the compiled iOS app artifact directly from your GitHub dashboard!

---

### **Phase 6: End-to-End System Testing & Verification**

#### Verification Checklist:
- [ ] **Customer App Test**: Select a cleaning service in Nagpur ➔ Select date/time slot ➔ Complete Razorpay online payment or Cash on service.
- [ ] **Cloud Backend Test**: Netlify serverless function (`create-order.js`) processes Razorpay order and writes record to Firebase Firestore.
- [ ] **Partner App Test**: Partner logs in via phone/PIN on partner mobile app ➔ Sees newly assigned job ➔ Taps "On the Way" ➔ Updates job status to "Completed".
- [ ] **Live Notification Test**: Customer receives live status update on customer app.

---

## 🚀 Summary
With this build strategy:
1. You can build and test the **Android APK locally on Windows** in **~3-4 days**.
2. You can build the **iOS App in the Cloud via GitHub Actions** without spending any money on a Mac laptop.
