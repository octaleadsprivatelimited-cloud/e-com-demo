import { NextResponse } from 'next/server';

/** Retired because it exposed raw Razorpay records without tenant ownership. */
export async function GET() {
  return NextResponse.json(
    { success: false, message: 'Raw payment-link lookup is disabled.' },
    { status: 410 },
  );
}
