import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { razorpayBasicAuthHeader } from '@/lib/razorpay-config';
import { callbackOrigin, enforcePaymentRateLimit, PAYMENT_PACKAGES, requireCustomer } from '@/lib/payment-security';

export async function POST(req: Request) {
  try {
    const user = await requireCustomer(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    const rate = enforcePaymentRateLimit(user.id, 'create');
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many payment-link requests' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } },
      );
    }
    const { packageId } = await req.json();
    const pkg = PAYMENT_PACKAGES[packageId as keyof typeof PAYMENT_PACKAGES];
    if (!pkg) return NextResponse.json({ success: false, message: 'Unknown package' }, { status: 400 });
    const referenceId = `poltica_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;

    const response = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: razorpayBasicAuthHeader(),
      },
      body: JSON.stringify({
        amount: pkg.amount * 100,
        currency: 'INR',
        description: `Poltica - ${pkg.name}`,
        reference_id: referenceId,
        callback_url: `${callbackOrigin(req.url)}/customer/billing/callback`,
        callback_method: 'get',
        notes: { ownerId: user.id, packageId },
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Log details server-side only.
      console.error('Razorpay Payment Link error:', errorData);
      return NextResponse.json(
        { success: false, message: 'Failed to create payment link' },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      short_url: data.short_url,
      payment_link_id: data.id,
      amount: data.amount,
      reference_id: referenceId,
    });
  } catch (error) {
    console.error('Payment link creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error creating payment link' },
      { status: 500 }
    );
  }
}
