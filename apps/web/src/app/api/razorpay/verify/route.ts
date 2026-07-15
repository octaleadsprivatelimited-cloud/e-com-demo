import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getRazorpayKeySecret } from '@/lib/razorpay-config';

export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, message: 'Missing payment parameters' },
        { status: 400 }
      );
    }

    // Secret loaded from server-only env var.
    const secret = getRazorpayKeySecret();
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(text)
      .digest('hex');

    // Constant-time comparison to avoid timing side-channels.
    const expected = Buffer.from(generated_signature, 'hex');
    const received = Buffer.from(String(razorpay_signature), 'hex');
    const valid =
      expected.length === received.length &&
      crypto.timingSafeEqual(expected, received);

    if (valid) {
      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully',
      });
    }
    return NextResponse.json(
      { success: false, message: 'Invalid signature' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Razorpay verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Verification error' },
      { status: 500 }
    );
  }
}
