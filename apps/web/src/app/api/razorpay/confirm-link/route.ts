import { NextResponse } from 'next/server';
import { razorpayBasicAuthHeader } from '@/lib/razorpay-config';
import { PAYMENT_PACKAGES, requireCustomer, signGrant, verifyPaymentLinkSignature } from '@/lib/payment-security';

export async function POST(req: Request) {
  try {
    const user = await requireCustomer(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    const body = await req.json();
    const linkId = String(body?.paymentLinkId || '');
    const referenceId = String(body?.referenceId || '');
    const status = String(body?.status || '');
    const paymentId = String(body?.paymentId || '');
    const signature = String(body?.signature || '');
    if (!linkId || !referenceId || status !== 'paid' || !paymentId || !signature) {
      return NextResponse.json({ success: false, message: 'Incomplete payment confirmation' }, { status: 400 });
    }
    if (!verifyPaymentLinkSignature({ linkId, referenceId, status, paymentId, signature })) {
      return NextResponse.json({ success: false, message: 'Invalid payment signature' }, { status: 403 });
    }
    const response = await fetch(`https://api.razorpay.com/v1/payment_links/${encodeURIComponent(linkId)}`, {
      headers: { Authorization: razorpayBasicAuthHeader() }, cache: 'no-store',
    });
    if (!response.ok) return NextResponse.json({ success: false, message: 'Payment verification failed' }, { status: 502 });
    const link = await response.json();
    const packageId = String(link?.notes?.packageId || '');
    const pkg = PAYMENT_PACKAGES[packageId as keyof typeof PAYMENT_PACKAGES];
    if (!pkg || link.status !== 'paid' || link.reference_id !== referenceId ||
        link.notes?.ownerId !== user.id || Number(link.amount) !== pkg.amount * 100) {
      return NextResponse.json({ success: false, message: 'Payment does not match this account or package' }, { status: 403 });
    }
    return NextResponse.json({
      success: true,
      ...signGrant({ sub: user.id, paymentId, linkId, packageId, exp: Date.now() + 5 * 60_000 }),
      receipt: { paymentId, packageName: pkg.name, amount: pkg.amount, credits: pkg.credits },
    });
  } catch (error) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json({ success: false, message: 'Payment verification failed' }, { status: 500 });
  }
}
