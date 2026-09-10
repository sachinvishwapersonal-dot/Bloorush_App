// Vercel Serverless Function: Razorpay Webhook Handler powered by Supabase PostgreSQL
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key);
}

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'] || req.headers['X-Razorpay-Signature'];
    const raw = await getRawBody(req);

    // 1. Verify HMAC Signature
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    if (!signature || expected !== signature) {
      console.error('[webhook] Invalid Razorpay signature');
      return res.status(400).send('invalid signature');
    }

    const data = JSON.parse(raw);
    if (data.event !== 'payment.captured' && data.event !== 'order.paid') {
      return res.status(200).send('ignored');
    }

    const payment = data.payload.payment.entity;
    const orderId = payment.order_id;
    const capturedAmount = payment.amount;

    const supabase = getSupabase();

    // 2. Execute atomic stored procedure in PostgreSQL
    const { data: result, error: rpcError } = await supabase.rpc('process_paid_order', {
      p_order_id: orderId,
      p_payment_id: payment.id,
      p_captured_amount: capturedAmount,
    });

    if (rpcError) {
      console.error('[webhook][500] Database RPC failure:', rpcError);
      return res.status(500).json({ error: rpcError.message });
    }

    console.log('[webhook][200] Payment processed successfully:', result);
    return res.status(200).json({ status: 'ok', outcome: result });
  } catch (e) {
    console.error('[webhook][500] processing error:', e && e.message);
    return res.status(500).json({ error: e.message });
  }
};

// Disable automatic bodyParser so raw buffer is preserved for HMAC verification
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
