-- ==============================================================================
-- BlooRush Supabase Database Schema & Initial Setup
-- Compatible with PostgreSQL 15+ & Supabase Realtime / Row Level Security (RLS)
-- ==============================================================================

-- 0. Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. TABLES DEFINITION
-- ==============================================================================

-- Service Areas / Zones in Nagpur
CREATE TABLE IF NOT EXISTS public.zones (
    id TEXT PRIMARY KEY,                       -- e.g. 'Dharampeth', 'Manish Nagar'
    is_open BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partners (Cleaners & Helpers)
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id TEXT UNIQUE NOT NULL,           -- e.g. 'BRP001', 'BRP002'
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    pin_hash TEXT NOT NULL,                    -- 4-6 digit security PIN
    hub TEXT NOT NULL DEFAULT 'Dharampeth Hub',
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Disabled', 'Suspended')),
    photo_url TEXT,
    language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi', 'mr')),
    attendance_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_partners_phone ON public.partners(phone);
CREATE INDEX IF NOT EXISTS idx_partners_partner_id ON public.partners(partner_id);

-- Time Slots & Capacity per Zone
CREATE TABLE IF NOT EXISTS public.slots (
    id TEXT PRIMARY KEY,                       -- Format: YYYY-MM-DD_Window_Zone
    slot_date DATE NOT NULL,
    slot_window TEXT NOT NULL,                 -- e.g. '10:00 AM - 12:00 PM'
    zone TEXT NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
    total_capacity INTEGER NOT NULL DEFAULT 2 CHECK (total_capacity >= 0),
    reserved_count INTEGER NOT NULL DEFAULT 0 CHECK (reserved_count >= 0),
    confirmed_count INTEGER NOT NULL DEFAULT 0 CHECK (confirmed_count >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_slots_lookup ON public.slots(slot_date, slot_window, zone);

-- Promotional Coupons
CREATE TABLE IF NOT EXISTS public.coupons (
    code TEXT PRIMARY KEY,                     -- e.g. 'BLOORUSH50'
    type TEXT NOT NULL CHECK (type IN ('flat', 'percent')),
    value NUMERIC(10, 2) NOT NULL CHECK (value > 0),
    min_order NUMERIC(10, 2) NOT NULL DEFAULT 0,
    max_discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    expiry_date DATE,
    usage_limit INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Service Booking Jobs
CREATE TABLE IF NOT EXISTS public.jobs (
    job_id TEXT PRIMARY KEY,                   -- e.g. 'JOB101'
    booking_id TEXT,
    status TEXT NOT NULL DEFAULT 'Assigned' 
        CHECK (status IN ('Paid', 'Assigned', 'Arrived', 'Started', 'Completed', 'Cancelled')),
    service_date DATE,
    slot_window TEXT,
    service_summary TEXT NOT NULL,
    customer_uid TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    customer_address TEXT NOT NULL,
    maps_link TEXT,
    zone TEXT REFERENCES public.zones(id),
    flat TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of service item objects [{name, qty, mins, price}]
    total_mins INTEGER NOT NULL DEFAULT 0,
    base_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    bonus_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    penalty_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    customer_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    payment_id TEXT,
    payment_status TEXT NOT NULL DEFAULT 'cash' CHECK (payment_status IN ('cash', 'paid')),
    instructions TEXT,
    slot_status TEXT NOT NULL DEFAULT 'ok' CHECK (slot_status IN ('ok', 'slot_full_reschedule')),
    slot_counted BOOLEAN NOT NULL DEFAULT false,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    review_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jobs_date ON public.jobs(service_date);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_phone ON public.jobs(customer_phone);

-- Relational Job Assignments
CREATE TABLE IF NOT EXISTS public.job_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id TEXT NOT NULL REFERENCES public.jobs(job_id) ON DELETE CASCADE,
    partner_id TEXT NOT NULL REFERENCES public.partners(partner_id) ON DELETE CASCADE,
    partner_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Assigned' CHECK (status IN ('Assigned', 'Arrived', 'Started', 'Completed')),
    incentive NUMERIC(10, 2) NOT NULL DEFAULT 0,
    arrived_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (job_id, partner_id)
);
CREATE INDEX IF NOT EXISTS idx_assignments_partner ON public.job_assignments(partner_id, status);

-- Daily Partner Attendance
CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY,                       -- Format: {partner_id}_{YYYY-MM-DD}
    partner_id TEXT NOT NULL REFERENCES public.partners(partner_id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    in_time TEXT,
    out_time TEXT,
    is_present BOOLEAN NOT NULL DEFAULT true,
    late_mins INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attendance_lookup ON public.attendance(attendance_date, partner_id);

-- Staged Razorpay Pending Orders
CREATE TABLE IF NOT EXISTS public.pending_orders (
    order_id TEXT PRIMARY KEY,                 -- Razorpay order_id
    job_id TEXT NOT NULL,
    amount_paise INTEGER NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'reconciliation_required')),
    payment_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- ==============================================================================
-- 2. STORED PROCEDURES (POSTGRES RPCs)
-- ==============================================================================

-- Atomic Razorpay Webhook Order Handler
CREATE OR REPLACE FUNCTION public.process_paid_order(
    p_order_id TEXT,
    p_payment_id TEXT,
    p_captured_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pend RECORD;
    v_slot_id TEXT;
    v_slot RECORD;
    v_slot_outcome TEXT := 'no_slot';
    v_payload JSONB;
BEGIN
    -- 1. Lock pending order row
    SELECT * INTO v_pend FROM public.pending_orders WHERE order_id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Pending order not found');
    END IF;

    IF v_pend.amount_paise <> p_captured_amount THEN
        UPDATE public.pending_orders 
        SET status = 'reconciliation_required', payment_id = p_payment_id 
        WHERE order_id = p_order_id;
        RETURN jsonb_build_object('status', 'amount_mismatch');
    END IF;

    v_payload := v_pend.payload;
    v_slot_id := REPLACE(CONCAT(v_payload->>'slotDate', '_', v_payload->>'slotWindow', '_', v_payload->>'zone'), ' ', '_');

    -- 2. Lock & check slot capacity
    IF v_slot_id IS NOT NULL THEN
        SELECT * INTO v_slot FROM public.slots WHERE id = v_slot_id FOR UPDATE;
        IF FOUND THEN
            IF v_slot.confirmed_count >= v_slot.total_capacity THEN
                v_slot_outcome := 'slot_full';
            ELSE
                UPDATE public.slots 
                SET confirmed_count = confirmed_count + 1, updated_at = NOW() 
                WHERE id = v_slot_id;
                v_slot_outcome := 'reserved';
            END IF;
        ELSE
            INSERT INTO public.slots (id, slot_date, slot_window, zone, total_capacity, confirmed_count)
            VALUES (v_slot_id, (v_payload->>'slotDate')::DATE, v_payload->>'slotWindow', v_payload->>'zone', 2, 1);
            v_slot_outcome := 'reserved';
        END IF;
    END IF;

    -- 3. Upsert job booking
    INSERT INTO public.jobs (
        job_id, booking_id, status, service_date, slot_window, service_summary,
        customer_uid, customer_name, customer_phone, customer_email, customer_address,
        maps_link, zone, flat, items, total_mins, base_amount, customer_price,
        payment_id, payment_status, slot_status, slot_counted
    ) VALUES (
        v_pend.job_id, v_pend.job_id, 'Paid', (v_payload->>'slotDate')::DATE, v_payload->>'slotWindow',
        COALESCE(v_payload->>'serviceSummary', 'Cleaning'),
        v_payload->>'uid', v_payload->>'name', v_payload->>'phone', v_payload->>'email',
        v_payload->>'address', v_payload->>'mapsLink', v_payload->>'zone', v_payload->>'flat',
        COALESCE(v_payload->'items', '[]'::jsonb),
        COALESCE((v_payload->>'totalMins')::INTEGER, 0),
        (v_pend.amount_paise / 100.0), (v_pend.amount_paise / 100.0),
        p_payment_id, 'paid',
        CASE WHEN v_slot_outcome = 'slot_full' THEN 'slot_full_reschedule' ELSE 'ok' END,
        (v_slot_outcome = 'reserved')
    )
    ON CONFLICT (job_id) DO UPDATE SET
        payment_id = EXCLUDED.payment_id,
        payment_status = 'paid',
        slot_status = EXCLUDED.slot_status,
        slot_counted = EXCLUDED.slot_counted,
        updated_at = NOW();

    -- 4. Mark pending order complete
    UPDATE public.pending_orders 
    SET status = 'paid', payment_id = p_payment_id, paid_at = NOW() 
    WHERE order_id = p_order_id;

    RETURN jsonb_build_object('status', 'success', 'slot_outcome', v_slot_outcome);
END;
$$;

-- Partner Status Transition RPC
CREATE OR REPLACE FUNCTION public.partner_transition_job(
    p_job_id TEXT,
    p_partner_id TEXT,
    p_next_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_asg RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    SELECT * INTO v_asg FROM public.job_assignments 
    WHERE job_id = p_job_id AND partner_id = p_partner_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'You are not assigned to this job.';
    END IF;

    -- Validate sequential transitions
    IF p_next_status = 'Arrived' AND v_asg.status <> 'Assigned' THEN
        RAISE EXCEPTION 'Can only arrive on an Assigned job.';
    ELSIF p_next_status = 'Started' AND v_asg.status <> 'Arrived' THEN
        RAISE EXCEPTION 'Can only start a job after arriving.';
    ELSIF p_next_status = 'Completed' AND v_asg.status <> 'Started' THEN
        RAISE EXCEPTION 'Can only complete an In Progress job.';
    END IF;

    UPDATE public.job_assignments
    SET 
        status = p_next_status,
        arrived_at = CASE WHEN p_next_status = 'Arrived' THEN v_now ELSE arrived_at END,
        started_at = CASE WHEN p_next_status = 'Started' THEN v_now ELSE started_at END,
        ended_at = CASE WHEN p_next_status = 'Completed' THEN v_now ELSE ended_at END,
        updated_at = v_now
    WHERE job_id = p_job_id AND partner_id = p_partner_id;

    UPDATE public.jobs SET status = p_next_status, updated_at = v_now WHERE job_id = p_job_id;

    RETURN jsonb_build_object('status', 'success', 'new_status', p_next_status);
END;
$$;

-- ==============================================================================
-- 3. SUPABASE REALTIME & ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Enable Realtime publication on primary operational tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.zones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coupons;

-- Enable Row Level Security
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Public/Read Policies for Customer Facing Tables
CREATE POLICY "Public Read Zones" ON public.zones FOR SELECT USING (true);
CREATE POLICY "Public Read Slots" ON public.slots FOR SELECT USING (true);
CREATE POLICY "Public Read Active Coupons" ON public.coupons FOR SELECT USING (is_active = true);

-- Service Role (Vercel Backend) bypasses RLS automatically with service_role secret.

-- ==============================================================================
-- 4. INITIAL SEED DATA (Nagpur Zones)
-- ==============================================================================
INSERT INTO public.zones (id, is_open) VALUES
    ('Dharampeth', true),
    ('Ramdaspeth', true),
    ('Manish Nagar', true),
    ('Pratap Nagar', true),
    ('Sadar', true),
    ('Civil Lines', true),
    ('Sitabuldi', true)
ON CONFLICT (id) DO NOTHING;
