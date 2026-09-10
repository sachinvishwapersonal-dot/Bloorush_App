// Vercel Serverless Function: Creates a Razorpay Order and stages pending order in Supabase
const Razorpay = require('razorpay');
const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY configuration');
  }
  return createClient(url, key);
}

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let stage = 'parse';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { jobId, amount, payload } = body;

    if (!jobId || !Number.isFinite(amount) || amount < 100) {
      return res.status(400).json({ error: 'Invalid order request: amount must be at least ₹1' });
    }

    stage = 'razorpay';
    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await rzp.orders.create({
      amount: Math.round(amount),
      currency: 'INR',
      receipt: jobId,
      notes: { jobId },
    });

    stage = 'supabase';
    const supabase = getSupabase();
    const { error: dbError } = await supabase.from('pending_orders').upsert({
      order_id: order.id,
      job_id: jobId,
      amount_paise: Math.round(amount),
      payload: payload || {},
      status: 'created',
    });

    if (dbError) {
      console.error('Failed to store pending_order in Supabase:', dbError);
      throw new Error(dbError.message || 'Database error storing pending order');
    }

    return res.status(200).json({
      order_id: order.id,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (e) {
    console.error('create-order failed at stage=' + stage, JSON.stringify({
      message: e && e.message,
      statusCode: e && e.statusCode,
      razorpayError: (e && e.error) ? {
        code: e.error.code,
        description: e.error.description,
        reason: e.error.reason,
        source: e.error.source,
        step: e.error.step,
        field: e.error.field
      } : undefined,
      config: {
        hasRazorpayKeyId: !!process.env.RAZORPAY_KEY_ID,
        hasRazorpayKeySecret: !!process.env.RAZORPAY_KEY_SECRET,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY),
      },
    }));

    const msg = (e && (e.message || (e.error && e.error.description))) || 'Order creation failed';
    return res.status(500).json({ error: msg });
  }
};
