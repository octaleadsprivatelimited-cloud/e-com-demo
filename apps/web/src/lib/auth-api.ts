/**
 * Poltica Auth API Client
 * ───────────────────────
 * Centralized client for communicating with the NestJS auth API.
 * Handles OTP, JWT sessions, and credential encryption via server-side APIs.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ─── Session Token Management ─────────────────────────────────

const TOKEN_KEY = 'poltica_session_token';

export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setSessionToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearSession(): void {
  try {
    const customer = JSON.parse(localStorage.getItem('currentCustomerUser') || 'null');
    if (/^\d{10}$/.test(customer?.mobile || '')) {
      localStorage.setItem('poltica_last_mobile', customer.mobile);
    }
  } catch {}
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('currentCustomerUser');
}

function authHeaders(): Record<string, string> {
  const token = getSessionToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── OTP Endpoints ────────────────────────────────────────────

export async function sendOtp(mobile: string): Promise<{
  success: boolean;
  message: string;
  otp?: string; // Only present in dev mode
}> {
  try {
    const res = await fetch(`${API_BASE}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, message: data.message || 'Failed to send OTP.' };
    }
    return data;
  } catch {
    // API offline — fallback to client-side OTP for development
    return { success: false, message: 'Auth API unavailable. Running in offline mode.' };
  }
}

export async function verifyOtp(
  mobile: string,
  otp: string,
  candidateId?: string,
): Promise<{
  success: boolean;
  message: string;
  token?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, otp, candidateId }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, message: data.message || 'OTP verification failed.' };
    }
    if (data.token) {
      setSessionToken(data.token);
    }
    return data;
  } catch {
    return { success: false, message: 'Auth API unavailable. Running in offline mode.' };
  }
}

// ─── Session Verification ─────────────────────────────────────

export async function verifySession(): Promise<{
  valid: boolean;
  user?: { mobile: string; id: string; role: string };
}> {
  const token = getSessionToken();
  
  if (token) {
    try {
      const res = await fetch(`${API_BASE}/auth/verify-session`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // API offline - fallback to local user check below
    }
  }

  return { valid: false };
}

// ─── Credential Encryption ────────────────────────────────────

export async function encryptCredentials(credentials: Record<string, string>): Promise<{
  success: boolean;
  encrypted?: Record<string, string>;
}> {
  try {
    const res = await fetch(`${API_BASE}/auth/encrypt-credentials`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(credentials),
    });
    if (!res.ok) return { success: false };
    return await res.json();
  } catch {
    // API offline — store as-is (fallback for dev)
    return { success: false };
  }
}

export async function decryptCredential(encrypted: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/auth/decrypt-credential`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ encrypted }),
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.value || '';
  } catch {
    return '';
  }
}
