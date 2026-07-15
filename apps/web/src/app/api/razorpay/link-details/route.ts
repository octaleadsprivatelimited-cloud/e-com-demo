import { NextResponse } from 'next/server';
import { razorpayBasicAuthHeader } from '@/lib/razorpay-config';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing payment link ID' }, { status: 400 });
    }

    const response = await fetch(`https://api.razorpay.com/v1/payment_links/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: {
        'Authorization': razorpayBasicAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Log details server-side only; do not leak upstream error to the client.
      console.error('Razorpay fetch link error:', errorData);
      return NextResponse.json({ success: false, message: 'Failed to fetch payment link' }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('link-details GET error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
