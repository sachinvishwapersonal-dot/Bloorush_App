# BlooRush Mobile Application — Architecture & Project Execution Plan

## 1. Executive Summary

This document outlines the architecture and execution strategy for converting the **BlooRush** web platform into a cross-platform mobile application (iOS & Android) using **Capacitor**. 

BlooRush is an on-demand home cleaning service operating in Nagpur. The ecosystem comprises three primary user interfaces backed by Firebase and Netlify serverless endpoints:
1. **Customer App**: On-demand service booking, slot scheduling, cart management, and Razorpay/Cash checkout.
2. **Partner App**: Field service partner portal for viewing assigned cleaning jobs, tracking daily tasks, and updating job progress in real-time.
3. **Admin Dashboard**: Operational dashboard for job dispatching, area/zone management, slot capacity, and partner management.

Using **Capacitor**, the existing web codebase (`index.html`, `partner-test/`, and backend scripts) will be encapsulated inside native mobile shells, enabling native mobile features (Push Notifications, GPS Geolocation, Haptics, Native Payment sheets) with minimal code overhead and fast time-to-prototype.

---

## 2. System Architecture

```mermaid
graph TD
    subgraph "Native Mobile Application Container"
        subgraph "Capacitor Native Runtime Bridge"
            iOS_Shell["iOS Native Shell (Swift / Xcode)"]
            Android_Shell["Android Native Shell (Java/Kotlin / Android Studio)"]
        end

        subgraph "WebView Presentation Layer (Local Assets)"
            CustomerApp["Customer App (index.html)"]
            PartnerApp["Partner App (partner-test/partner.html)"]
            AdminPortal["Admin Portal (partner-test/admin.html)"]
        end

        subgraph "Capacitor Native Plugins"
            GeoPlugin["@capacitor/geolocation (GPS Tracking)"]
            PushPlugin["@capacitor/push-notifications (FCM Alerts)"]
            StatusBarPlugin["@capacitor/status-bar & @capacitor/keyboard"]
            HapticsPlugin["@capacitor/haptics & Device Storage"]
        end
    end

    subgraph "Backend Services & Cloud Infrastructure"
        FirebaseSDK["Firebase Auth & Cloud Firestore DB"]
        NetlifyBackend["Netlify Serverless Functions\n(/netlify/functions/create-order.js)\n(/netlify/functions/razorpay-webhook.js)"]
        RazorpayGateway["Razorpay Payment Gateway API"]
    end

    CustomerApp --> Capacitor Native Plugins
    PartnerApp --> Capacitor Native Plugins

    CustomerApp -- "User Auth & Live Bookings" --> FirebaseSDK
    PartnerApp -- "Partner Auth & Job Status" --> FirebaseSDK
    AdminPortal -- "Operations & Dispatch" --> FirebaseSDK

    CustomerApp -- "Create Payment Order" --> NetlifyBackend
    NetlifyBackend -- "Razorpay API Request" --> RazorpayGateway
    NetlifyBackend -- "Update Payment Status" --> FirebaseSDK
```

---

## 3. Project Directory Structure

```
Bloorush_App/
├── index.html                  # Customer Mobile App (Web view target)
├── netlify.toml                # Netlify deployment configuration
├── package.json                # Project dependencies & Capacitor packages
├── netlify/
│   └── functions/
│       ├── create-order.js     # Serverless Razorpay order generator
│       └── razorpay-webhook.js # Serverless payment confirmation webhook
├── partner-test/
│   ├── admin.html              # Admin Operations Portal
│   ├── partner.html            # Partner Field App (Web view target)
│   ├── partner.js              # Partner logic & multi-language UI
│   ├── admin.js                # Admin management logic
│   └── styles.css              # Partner & Admin portal styles
├── capacitor.config.json       # Capacitor configuration (App ID, Name, WebDir)
├── android/                    # Generated Android Native Studio Project
├── ios/                        # Generated iOS Xcode Project
└── docs/
    └── ARCHITECTURE_AND_PROJECT_PLAN.md  # Project Architecture & Plan
```

---

## 4. Phase-by-Phase Execution Plan

### **Phase 1: Environment Setup & Capacitor Initialization**
- [x] Create Architecture & Project Execution Plan (`docs/ARCHITECTURE_AND_PROJECT_PLAN.md`).
- [ ] Install Capacitor core dependencies (`@capacitor/core`, `@capacitor/cli`).
- [ ] Initialize Capacitor configuration (`capacitor.config.json`) with App ID `com.bloorush.app` and App Name `BlooRush`.
- [ ] Add Android platform target (`@capacitor/android`) and iOS platform target (`@capacitor/ios`).
- [ ] Configure asset routing for Customer App (`index.html`) and Partner App (`partner-test/partner.html`).

### **Phase 2: Mobile Viewport & Safe-Area UI Adaptations**
- [ ] Update `viewport` meta tags across HTML files to prevent unwanted zooming and enable `viewport-fit=cover`.
- [ ] Apply CSS safe-area inset padding (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`) for iPhone notch and Android gesture bars.
- [ ] Adjust tap responsiveness (`touch-action: manipulation`) and scroll behavior (`-webkit-overflow-scrolling: touch`).

### **Phase 3: Native Hardware & Service Integration**
- [ ] **Plugins Installation**:
  - `@capacitor/geolocation` (For partner job location tracking & customer location detection).
  - `@capacitor/push-notifications` (Linked with Firebase Cloud Messaging for live alerts).
  - `@capacitor/status-bar` & `@capacitor/keyboard` (Prevent layout shift on mobile input focus).
  - `@capacitor/haptics` (Tactile feedback on button presses).
- [ ] Bridge native Capacitor plugins with existing JavaScript functions in `index.html` and `partner.js`.

### **Phase 4: Razorpay Payment & Firebase Backend Testing**
- [ ] Test Firebase Authentication and Cloud Firestore live listeners inside native mobile webviews.
- [ ] Verify Razorpay payment flow via Netlify serverless functions (`create-order.js`) on mobile devices.
- [ ] Implement fallback handling for payment cancellations or network drops.

### **Phase 5: Build Generation & Verification**
- [ ] Generate Android Debug APK (`app-debug.apk`) for testing on real Android devices.
- [ ] Generate iOS build package via Xcode for iPhone testing / TestFlight.
- [ ] Conduct end-to-end booking verification:
  1. Customer creates a cleaning booking on the Customer Mobile App.
  2. Order is recorded in Firebase Firestore and triggers Netlify payment verification.
  3. Job appears instantly on the Partner Mobile App.
  4. Partner accepts and updates status (`On the Way` ➔ `Completed`).

---

## 5. Risk Assessment & Future Roadmap

| Risk Area | Mitigation Strategy |
| :--- | :--- |
| **Apple Guideline 4.2 (Web Wrapper)** | Integrate native push notifications, haptics, and location plugins to ensure Apple recognizes native app features. |
| **Background Location Tracking** | Use `@capacitor/geolocation` for foreground check-ins; evaluate native background plugins for high-frequency GPS tracking. |
| **Future Scaling** | Maintain clean separation of web logic so the app can be seamlessly migrated to **React Native** or **Flutter** when scaling production requirements. |
