import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://checkout.razorpay.com/v1/checkout.js', {
      headers: {
        'Accept': 'application/javascript',
      },
    });

    if (!res.ok) {
      return new NextResponse('Failed to load Razorpay SDK', { status: 502 });
    }

    const scriptContent = await res.text();

    return new NextResponse(scriptContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Razorpay SDK proxy error:', error);
    return new NextResponse('Failed to proxy Razorpay SDK', { status: 500 });
  }
}
