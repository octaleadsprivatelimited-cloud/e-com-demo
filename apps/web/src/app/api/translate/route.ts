import { NextResponse } from 'next/server';
import { requireCustomer } from '@/lib/payment-security';

const LOCAL_TRANSLATIONS = new Map([
  ['Dear Voter, please join our grand rally tomorrow at [Location] at [Time]. Support [Candidate Name]! - Poltica', 'ప్రియమైన ఓటరు, రేపు [Location]లో [Time]కు జరిగే మా భారీ బహిరంగ సభలో పాల్గొనండి. [Candidate Name]కు మద్దతు ఇవ్వండి! - Poltica'],
  ['Vote for [Candidate Name] for a better future! Your vote counts on [Date]. Press the [Symbol] button. - Poltica', 'మెరుగైన భవిష్యత్తు కోసం [Candidate Name]కు ఓటు వేయండి! [Date]న మీ అమూల్యమైన ఓటు వేయండి. [Symbol] గుర్తు బటన్ నొక్కండి. - Poltica'],
]);

type RateRecord = { count: number; resetAt: number };
const limits = new Map<string, RateRecord>();

function allow(identity: string) {
  const now = Date.now();
  const record = limits.get(identity);
  if (!record || record.resetAt <= now) {
    limits.set(identity, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (record.count >= 20) return false;
  record.count += 1;
  return true;
}

export async function POST(req: Request) {
  try {
    const user = await requireCustomer(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    if (!allow(user.id)) return NextResponse.json({ message: 'Too many translation requests' }, { status: 429 });

    const body = await req.json();
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!text || text.length > 2_000 || body?.target !== 'te') {
      return NextResponse.json({ message: 'Valid text and Telugu target are required' }, { status: 400 });
    }
    const local = LOCAL_TRANSLATIONS.get(text);
    if (local) return NextResponse.json({ translatedText: local, provider: 'approved-template' });

    const apiKey = process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: 'Custom translation is not configured' }, { status: 503 });
    }
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, target: 'te', source: 'en', format: 'text' }),
        signal: AbortSignal.timeout(8_000),
        cache: 'no-store',
      },
    );
    if (!response.ok) return NextResponse.json({ message: 'Translation provider failed' }, { status: 502 });
    const data = await response.json();
    const translatedText = String(data?.data?.translations?.[0]?.translatedText || '').trim();
    if (!translatedText) return NextResponse.json({ message: 'Translation provider returned no text' }, { status: 502 });
    return NextResponse.json({ translatedText, provider: 'google-cloud' });
  } catch {
    return NextResponse.json({ message: 'Translation could not be completed' }, { status: 500 });
  }
}
