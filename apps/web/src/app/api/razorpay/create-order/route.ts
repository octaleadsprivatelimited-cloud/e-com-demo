import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getRazorpayKeyId, getRazorpayKeySecret } from '@/lib/razorpay-config';

export async function POST(req: Request) {
  // Retired: this legacy endpoint accepted arbitrary unauthenticated amounts.
  // Checkout now uses the authenticated, catalog-bound payment-link route.
  void req;
  return NextResponse.json(
    { success: false, message: 'Use the authenticated payment-link checkout.' },
    { status: 410 },
  );
  /* istanbul ignore next -- retained temporarily for migration history */
  // eslint-disable-next-line no-unreachable
  try {
    const { amount, receipt, notes } = await req.json();

    // Validate amount server-side (never trust the client).
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Credentials are loaded from server-only env vars.
    const razorpay = new Razorpay({
      key_id: getRazorpayKeyId(),
      key_secret: getRazorpayKeySecret(),
    });

    const options = {
      amount: Math.round(amountNum * 100), // amount in smallest currency unit (paise)
      currency: 'INR',
      receipt: receipt || `rcpt_${Math.floor(Math.random() * 10000)}`,
      notes: notes || {},
    };

    const order = await razorpay.orders.create(options);
    return NextResponse.json({ success: true, order });
  } catch (error) {
    // Log full error server-side only; do not leak internals to the client.
    console.error('Razorpay order creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Error creating Razorpay order' },
      { status: 500 }
    );
  }
}
