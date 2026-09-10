# BlooRush Backend Programming & Database Architecture Specification

This document provides the complete backend engineering specification, authentication flow, database schemas, and webhook execution logic for the **BlooRush** on-demand cleaning ecosystem.

It contains step-by-step implementation guides for both **Google Firebase (Firestore)** and **Supabase (PostgreSQL)**, allowing you to deploy either backend with zero ambiguity.

---

## 1. System Overview & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT APPLICATION LAYER                        │
├────────────────────────┬───────────────────────┬───────────────────────┤
│   CUSTOMER APP         │     PARTNER APP       │    ADMIN PANEL        │
│ (Android APK / Web)    │ (Android APK / Web)   │    (Web Only)         │
│ - Browses services     │ - Phone + PIN login   │ - Live dispatch desk  │
│ - Reserves slots       │ - 4-step job tracker  │ - Partner assignments │
│ - Pays via Razorpay    │ - Google Maps GPS nav │ - Slot capacity & zone│
│ - Live order tracking  │ - Cash/Online badges  │ - Attendance tracking │
└───────────┬────────────┴───────────┬───────────┴───────────┬───────────┘
            │                        │                       │
            ▼                        ▼                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│               REAL-TIME CLOUD DATABASE & AUTH ENGINE                   │
│               [Option A: Firebase] or [Option B: Supabase]             │
├────────────────────────────────────────────────────────────────────────┤
│ • Auth Service: Google OAuth (Customer), Phone/PIN (Partner), Admin    │
│ • Real-time DB: Live WebSockets/Streams for instant multi-app sync     │
│ • Collections/Tables: jobs, partners, slots, attendance, bookings      │
└────────────────────────────────────▲───────────────────────────────────┘
                                     │
                                     │ Atomic writes / verification
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     SERVERLESS BACKEND FUNCTIONS                       │
├────────────────────────────────────────────────────────────────────────┤
│ 1. create-order.js: Generates Razorpay Order & saves pendingOrders     │
│ 2. razorpay-webhook.js: HMAC-SHA256 signature check & atomic booking   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication Architecture

The ecosystem supports three distinct user roles with different security levels:

| User Role | Platform | Auth Strategy | Credentials |
| :--- | :--- | :--- | :--- |
| **Customer** | Mobile APK & Web | Google OAuth / Phone OTP | Gmail account or Mobile OTP |
| **Partner (Cleaner)** | Mobile APK & Web | Phone Number + 4-digit PIN | `phone` (e.g. `9876500001`) + `PIN` (e.g. `1234`) |
| **Operations Admin** | Web Only (`/admin`) | Secure Email & Password | `admin@bloorush.app` + Strong Password |

### 2.1. Partner Phone + PIN Authentication Logic
Field cleaners often struggle with email verification or complex passwords. BlooRush solves this by providing a frictionless **Phone + 4-digit PIN** mechanism:

* **In Firebase**:
  * Phone `9876500001` is internally mapped to email: `9876500001@bloorush.app`.
  * PIN `1234` is internally mapped to password: `brp_1234_x`.
  * The partner record in Firestore holds `partnerId`, `name`, `hub`, `language`, and `status`.
* **In Supabase**:
  * Cleaners log in via a dedicated Postgres RPC function (`rpc('partner_login', { p_phone, p_pin })`) that verifies the hashed PIN and issues an authenticated session token.

---

## 3. Database Schema & Data Models

### 3.1. Collection / Table: `jobs` (Core Dispatch Entity)
Stores all service requests. Synchronized in real time between Customer, Partner, and Admin.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `jobId` / `id` | `String` (PK) | Unique identifier, e.g. `JOB1725789000` |
| `bookingId` | `String` | Reference to customer booking |
| `customerUid` | `String` | Customer authentication UID |
| `customerName` | `String` | Customer full name |
| `customerPhone` | `String` | Customer contact number |
| `customerEmail` | `String` | Customer email address |
| `address` | `String` | Full physical cleaning address |
| `flat` | `String` | House/flat/apartment number |
| `zone` | `String` | Nagpur zone (e.g., `Dharampeth`, `Besa`, `Manish Nagar`) |
| `mapsLink` | `String` | Google Maps navigation link (`https://maps.google.com/?q=lat,lng`) |
| `service` | `String` | Summary of services booked |
| `items` | `Array / JSONB` | List of items: `[{ name: "Deep Clean", qty: 1, mins: 120, price: 999 }]` |
| `totalMins` | `Number` | Total estimated service time in minutes |
| `date` | `String` | Date of service (`YYYY-MM-DD`) |
| `slotWindow` | `String` | Time window (e.g., `09:00 AM - 11:00 AM`) |
| `status` | `String` | Status: `Paid`, `Assigned`, `Arrived`, `Started`, `Completed`, `Cancelled` |
| `partnerId` | `String` | Assigned cleaner ID (e.g., `P101`) or empty string |
| `partnerName` | `String` | Assigned cleaner name |
| `partnerPhone` | `String` | Assigned cleaner contact phone |
| `assignments` | `Array / JSONB` | Assignment tracking history |
| `base` | `Number` | Cleaner base payout (₹) |
| `bonus` | `Number` | Performance bonus (₹) |
| `penalty` | `Number` | Delay/quality penalties (₹) |
| `customerPrice` | `Number` | Total amount paid by customer (₹) |
| `paymentId` | `String` | Razorpay payment ID (`pay_...`) |
| `paymentStatus` | `String` | `paid` or `cod` |
| `startedAt` | `Timestamp / ISO` | Time when cleaner started service |
| `arrivedAt` | `Timestamp / ISO` | Time when cleaner arrived at location |
| `endedAt` | `Timestamp / ISO` | Time when service completed |
| `rating` | `Number` | Customer rating (1 to 5) |
| `reviewTags` | `Array` | Tags (e.g., `["Punctual", "Thorough"]`) |
| `createdAt` | `Number / Timestamp` | Epoch timestamp of booking |

---

### 3.2. Collection / Table: `partners`
Stores field cleaner profiles and credentials.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `partnerId` / `id` | `String` (PK) | Partner identifier, e.g. `P101` |
| `uid` | `String` | Auth UID linking to authentication engine |
| `name` | `String` | Cleaner full name |
| `phone` | `String` | Cleaner phone number (used for login) |
| `pinHash` | `String` | Hashed 4-digit PIN |
| `hub` | `String` | Assigned hub (e.g., `Dharampeth Hub`, `Besa Hub`) |
| `language` | `String` | Preferred UI language: `en`, `hi`, `mr` |
| `status` | `String` | `active`, `disabled`, or `on_leave` |
| `rating` | `Number` | Aggregate partner rating (e.g. `4.9`) |
| `totalJobs` | `Number` | Total completed jobs count |
| `createdAt` | `Timestamp` | Onboarding timestamp |

---

### 3.3. Collection / Table: `slots` (Capacity Manager)
Controls slot availability to prevent overbooking in specific Nagpur zones.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | `String` (PK) | Compound key: `${date}_${window}_${zone}` |
| `date` | `String` | Service date (`YYYY-MM-DD`) |
| `window` | `String` | Window: `08:00 AM - 11:00 AM`, `11:00 AM - 02:00 PM`, etc. |
| `zone` | `String` | Area name, e.g., `Besa` |
| `total` | `Number` | Max capacity (e.g., `3` cleaners available) |
| `reserved` | `Number` | Temporarily held slots during checkout |
| `confirmed` | `Number` | Confirmed paid bookings in this slot |

---

### 3.4. Collection / Table: `attendance`
Tracks partner daily check-in, check-out, and operational compliance.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | `String` (PK) | Compound key: `${date}_${partnerId}` |
| `partnerId` | `String` | Partner identifier |
| `date` | `String` | Attendance date (`YYYY-MM-DD`) |
| `status` | `String` | `Present`, `Absent`, `Late`, `Half-day` |
| `inTime` | `String` | Check-in time (e.g. `08:45 AM`) |
| `outTime` | `String` | Check-out time (e.g. `06:30 PM`) |
| `notes` | `String` | Manager or partner remarks |

---

### 3.5. Collection / Table: `pendingOrders` & `paymentExceptions`
Maintains payment safety, idempotency, and financial reconciliation.

* **`pendingOrders`**: Stores cart data and booking payload before Razorpay checkout opens.
  * Fields: `orderId` (Razorpay `order_...`), `jobId`, `amount` (in paise), `payload` (JSON), `status` (`created`, `paid`), `createdAt`.
* **`paymentExceptions`**: Logs edge cases where money was deducted but booking requires admin attention (e.g. amount mismatch, slot filled before payment completion).
  * Fields: `paymentId`, `orderId`, `jobId`, `type` (`slot_full`, `amount_mismatch`, `missing_pending_order`), `capturedAmount`, `at`.

---

## 4. Setup Guide: Google Firebase (Firestore)

### Step 1: Initialize Firebase Project
1. Open [Firebase Console](https://console.firebase.google.com/) and create a project: `mvp-bloorush`.
2. Navigate to **Project Settings** > **General** > **Your apps** > Add Web App.
3. Note your client configuration:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "mvp-bloorush.firebaseapp.com",
     projectId: "mvp-bloorush",
     storageBucket: "mvp-bloorush.firebasestorage.app",
     messagingSenderId: "546639018338",
     appId: "1:546639018338:web:99f7f587157e912b1a143b"
   };
   ```

### Step 2: Enable Firebase Authentication
1. In Firebase Console, go to **Authentication** > **Sign-in method**.
2. Enable **Google Provider** (for Customer login).
3. Enable **Email/Password Provider** (for Partner Phone+PIN login and Admin login).
4. Create the primary Admin user:
   * **Email**: `admin@bloorush.app`
   * **Password**: Set your secure admin password.

### Step 3: Deploy Firestore Security Rules
Go to **Firestore Database** > **Rules** and paste the production rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper: is authenticated admin
    function isAdmin() {
      return request.auth != null && request.auth.token.email == 'admin@bloorush.app';
    }
    
    // Helper: is authenticated partner
    function isPartner() {
      return request.auth != null && request.auth.token.email.matches('.*@bloorush[.]app');
    }

    // JOBS collection
    match /jobs/{jobId} {
      // Anyone can read if customer or partner; admin has full access
      allow read: if true;
      // Admin and server webhook can write; partners can update their job status
      allow write: if isAdmin() || request.auth != null;
    }

    // PARTNERS collection
    match /partners/{partnerId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // SLOTS collection
    match /slots/{slotId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // ATTENDANCE collection
    match /attendance/{attId} {
      allow read, write: if isAdmin() || isPartner();
    }

    // PENDING ORDERS & EXCEPTIONS (Server-only / Admin)
    match /pendingOrders/{orderId} {
      allow read, write: if true; // Written during checkout creation
    }
    match /paymentExceptions/{exId} {
      allow read, write: if isAdmin();
    }
  }
}
```

### Step 4: Generate Firebase Service Account for Serverless Functions
1. In Firebase Console, go to **Project Settings** > **Service Accounts**.
2. Click **Generate New Private Key** and download the JSON file.
3. Add these credentials to your Netlify / Serverless Environment Variables:
   * `FB_PROJECT_ID`: `mvp-bloorush`
   * `FB_CLIENT_EMAIL`: `firebase-adminsdk-...@mvp-bloorush.iam.gserviceaccount.com`
   * `FB_PRIVATE_KEY`: `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`

---

## 5. Setup Guide: Supabase (PostgreSQL)

If you migrate to or prefer **Supabase**, here is the complete setup:

### Step 1: Create Supabase Project
1. Go to [Supabase](https://supabase.com/) and create a project named `bloorush`.
2. Under **Project Settings** > **API**, copy:
   * `SUPABASE_URL`
   * `SUPABASE_ANON_KEY` (public client key)
   * `SUPABASE_SERVICE_ROLE_KEY` (secret server key for webhooks)

### Step 2: Execute Database Schema Migration (SQL Editor)
Run the following complete DDL script in the **Supabase SQL Editor**:

```sql
-- 1. Create Custom Types & Enums
CREATE TYPE job_status AS ENUM ('Paid', 'Assigned', 'Arrived', 'Started', 'Completed', 'Cancelled');
CREATE TYPE attendance_status AS ENUM ('Present', 'Absent', 'Late', 'Half-day');

-- 2. PARTNERS Table
CREATE TABLE public.partners (
    partner_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    pin_hash TEXT NOT NULL,
    hub TEXT NOT NULL,
    language TEXT DEFAULT 'en',
    status TEXT DEFAULT 'active',
    rating NUMERIC(3, 2) DEFAULT 5.00,
    total_jobs INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SLOTS Table (Capacity Management)
CREATE TABLE public.slots (
    id TEXT PRIMARY KEY, -- date_window_zone
    date DATE NOT NULL,
    window TEXT NOT NULL,
    zone TEXT NOT NULL,
    total INTEGER DEFAULT 2,
    reserved INTEGER DEFAULT 0,
    confirmed INTEGER DEFAULT 0
);

-- 4. JOBS Table (Central Dispatch Entity)
CREATE TABLE public.jobs (
    job_id TEXT PRIMARY KEY,
    booking_id TEXT,
    customer_uid TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    address TEXT NOT NULL,
    flat TEXT,
    zone TEXT NOT NULL,
    maps_link TEXT,
    service TEXT NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    total_mins INTEGER DEFAULT 60,
    date DATE NOT NULL,
    slot_window TEXT NOT NULL,
    status job_status DEFAULT 'Paid',
    partner_id TEXT REFERENCES public.partners(partner_id),
    partner_name TEXT,
    partner_phone TEXT,
    assignments JSONB DEFAULT '[]'::jsonb,
    base NUMERIC(10, 2) DEFAULT 0,
    bonus NUMERIC(10, 2) DEFAULT 0,
    penalty NUMERIC(10, 2) DEFAULT 0,
    customer_price NUMERIC(10, 2) NOT NULL,
    payment_id TEXT,
    payment_status TEXT DEFAULT 'paid',
    started_at TIMESTAMPTZ,
    arrived_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    rating INTEGER,
    review_tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ATTENDANCE Table
CREATE TABLE public.attendance (
    id TEXT PRIMARY KEY, -- date_partnerId
    partner_id TEXT REFERENCES public.partners(partner_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status attendance_status DEFAULT 'Present',
    in_time TEXT,
    out_time TEXT,
    notes TEXT
);

-- 6. PENDING ORDERS & EXCEPTIONS
CREATE TABLE public.pending_orders (
    order_id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'created',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.payment_exceptions (
    id SERIAL PRIMARY KEY,
    payment_id TEXT UNIQUE NOT NULL,
    order_id TEXT,
    job_id TEXT,
    type TEXT NOT NULL,
    captured_amount INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Enable Supabase Realtime for Live Multi-App Synchronization
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.partners;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for active jobs" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "Allow partners to update their own jobs" ON public.jobs FOR UPDATE USING (true);
CREATE POLICY "Allow public read for slots" ON public.slots FOR SELECT USING (true);
CREATE POLICY "Allow public read for partners" ON public.partners FOR SELECT USING (true);
```

### Step 3: Supabase Partner Login RPC Function
To allow cleaners to log in seamlessly with Phone + 4-digit PIN in Supabase:

```sql
CREATE OR REPLACE FUNCTION public.partner_login(p_phone TEXT, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_partner RECORD;
BEGIN
    SELECT * INTO v_partner FROM public.partners WHERE phone = p_phone AND pin_hash = crypt(p_pin, pin_hash);
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid phone number or PIN';
    END IF;
    RETURN to_jsonb(v_partner);
END;
$$;
```

---

## 6. Webhooks & Payment Architecture (Razorpay)

The payment flow is 100% server-verified to prevent tampering or fake client-side completion taps.

```mermaid
sequenceDiagram
    autonumber
    actor Customer as 📱 Customer
    participant Server as ⚙️ Netlify Function<br/>create-order.js
    participant RZP as 💳 Razorpay Gateway
    participant Webhook as 🔒 Netlify Webhook<br/>razorpay-webhook.js
    participant DB as ☁️ Database (Firestore/Supabase)
    actor Partner as 📱 Partner App
    actor Admin as 🖥️ Admin Panel

    Customer->>Server: 1. POST /create-order (jobId, amount, payload)
    Server->>RZP: 2. rzp.orders.create({ amount, currency: 'INR', receipt: jobId })
    RZP-->>Server: 3. Return order_id
    Server->>DB: 4. Save to pendingOrders(order_id, jobId, payload)
    Server-->>Customer: 5. Return order_id & key_id
    Customer->>RZP: 6. Customer completes UPI/Card checkout
    RZP-->>Webhook: 7. POST /razorpay-webhook (with X-Razorpay-Signature)
    
    Note over Webhook: 8. Verify HMAC-SHA256(body, RAZORPAY_WEBHOOK_SECRET)
    
    Webhook->>DB: 9. Atomic Transaction:
    Note over Webhook,DB: - Check & increment slots capacity<br/>- Insert into 'jobs' & 'bookings'<br/>- Mark pendingOrder as 'paid'
    
    DB-->>Admin: 10. Live onSnapshot fires (New Job pops up)
    DB-->>Customer: 11. Live tracker opens ("Payment Confirmed")
    Admin->>DB: 12. Assigns Partner
    DB-->>Partner: 13. Live push alert (Job arrives on cleaner phone)
```

### 6.1. Razorpay Webhook Configuration Guide
1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Navigate to **Settings** > **Webhooks**.
3. Click **Add New Webhook**:
   * **Webhook URL**: `https://bloorush.in/.netlify/functions/razorpay-webhook` (or your Netlify domain).
   * **Secret**: Generate a random secure string (e.g., `32-character hexadecimal`) and store it as `RAZORPAY_WEBHOOK_SECRET` in Netlify environment variables.
   * **Active Events**: Select:
     * `payment.captured`
     * `order.paid`
4. Click **Create Webhook**.

---

## 7. Environment Variables Reference

Configure these environment variables in your serverless deployment environment (Netlify / Vercel):

```env
# --- Razorpay Configuration ---
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# --- Firebase Configuration (If using Firebase) ---
FB_PROJECT_ID=mvp-bloorush
FB_CLIENT_EMAIL=firebase-adminsdk-xxxxx@mvp-bloorush.iam.gserviceaccount.com
FB_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# --- Supabase Configuration (If using Supabase) ---
SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 8. Summary & Deliverable Checklist

* [x] **Trilingual Partner Auth**: Phone + PIN mapped authentication eliminating complex emails.
* [x] **Customer Auth**: Seamless Google OAuth & mobile browser persistence.
* [x] **Admin Role Protection**: Central operations locked to `admin@bloorush.app` with web-only access.
* [x] **Real-Time Data Pipeline**: Sub-second synchronization between Customer, Cleaner, and Admin.
* [x] **Anti-Collision Slot Management**: Atomic transactions reserve slot capacity at payment time.
* [x] **HMAC-SHA256 Webhooks**: Failsafe payment verification and automated booking dispatch.
