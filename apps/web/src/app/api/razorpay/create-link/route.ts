import { NextResponse } from 'next/server';
import { razorpayBasicAuthHeader } from '@/lib/razorpay-config';

export async function POST(req: Request) {
  try {
    const { amount, description, notes, callbackUrl } = await req.json();

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid amount' },
        { status: 400 }
      );
    }

    const response = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: razorpayBasicAuthHeader(),
      },
      body: JSON.stringify({
        amount: Math.round(amountNum * 100), // in paise
        currency: 'INR',
        description: description || 'Poltica Credit Purchase',
        callback_url: callbackUrl,
        callback_method: 'get',
        notes: notes || {},
      }),
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
    });
  } catch (error) {
    console.error('Payment link creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error creating payment link' },
      { status: 500 }
    );
  }
}
