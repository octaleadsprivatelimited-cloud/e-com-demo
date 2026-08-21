export async function GET() {
  return new Response('The same-origin Razorpay SDK proxy is disabled.', {
    status: 410,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
