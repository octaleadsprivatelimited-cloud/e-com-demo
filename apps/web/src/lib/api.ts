/**
 * Poltica API Client
 * ──────────────────
 * Thin, typed wrapper around the NestJS backend. Automatically attaches the
 * Bearer session token and normalizes error handling. Resource helpers below
 * replace direct localStorage access as pages are migrated to the API.
 */
import { getSessionToken } from './auth-api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * apiFetch with automatic recovery for transient failures.
 * Only *idempotent* requests (GET) are retried — a write (POST/PATCH/DELETE)
 * such as a credit top-up is NEVER auto-retried, so it can't double-apply.
 * Retries cover network drops and transient upstream 502/503/504.
 */
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const idempotent = method === 'GET' || method === 'HEAD';
  const maxAttempts = idempotent ? 3 : 1;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const token = getSessionToken();
      const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
      });

      if (!res.ok) {
        // Auto-recover transient upstream errors on safe requests.
        if (idempotent && [502, 503, 504].includes(res.status) && attempt < maxAttempts) {
          await delay(attempt * 300);
          continue;
        }
        let message = `Request failed (${res.status})`;
        try {
          const body = await res.json();
          message = Array.isArray(body.message)
            ? body.message.join(', ')
            : body.message || message;
        } catch {
          /* non-JSON error body */
        }
        throw new ApiError(message, res.status);
      }

      if (res.status === 204) return undefined as T;
      return (await res.json()) as T;
    } catch (e) {
      lastError = e;
      // A thrown fetch = network failure. Retry only safe requests.
      const isNetwork = !(e instanceof ApiError);
      if (idempotent && isNetwork && attempt < maxAttempts) {
        await delay(attempt * 300);
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}

// ─── Types ────────────────────────────────────────────────────────
export interface Candidate {
  id: string;
  name: string;
  mobile: string;
  district?: string;
  area?: string;
  state?: string;
  pincode?: string;
  status: 'Active' | 'Suspended' | 'Pending';
  balances: { sms: number; wa: number; ivr: number };
  payments: number;
  contacts: number;
  uniqueUrl?: string;
  manifestoUrl?: string;
  brochureUrl?: string;
  [key: string]: any;
}

// ─── Candidates resource ──────────────────────────────────────────
export const candidatesApi = {
  me: () => apiFetch<Candidate>('/candidates/me'),
  /**
   * Get the current candidate, creating (syncing) it server-side from the local
   * fallback if the server has no record yet. Makes credit/billing self-healing
   * for accounts whose signup sync didn't reach the API.
   */
  ensure: async (fallback?: Partial<Candidate>): Promise<Candidate> => {
    try {
      return await candidatesApi.me();
    } catch (e) {
      if (fallback && fallback.mobile) {
        return await candidatesApi.create(fallback);
      }
      throw e;
    }
  },
  list: () => apiFetch<Candidate[]>('/candidates'),
  get: (id: string) => apiFetch<Candidate>(`/candidates/${id}`),
  create: (data: Partial<Candidate>) =>
    apiFetch<Candidate>('/candidates', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, patch: Partial<Candidate>) =>
    apiFetch<Candidate>(`/candidates/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  remove: (id: string) =>
    apiFetch<{ success: boolean }>(`/candidates/${id}`, { method: 'DELETE' }),
};

// ─── Contacts resource (tenant-scoped) ───────────────────────────
export interface Contact {
  id: string;
  ownerId: string;
  name: string;
  mobile: string;
  tag?: string;
  createdAt: string;
}

export const contactsApi = {
  list: () => apiFetch<Contact[]>('/contacts'),
  add: (data: { name?: string; mobile: string; tag?: string }) =>
    apiFetch<Contact>('/contacts', { method: 'POST', body: JSON.stringify(data) }),
  bulk: (contacts: Array<{ name?: string; mobile: string; tag?: string }>) =>
    apiFetch<{ added: number; contacts: Contact[] }>('/contacts/bulk', {
      method: 'POST',
      body: JSON.stringify({ contacts }),
    }),
  remove: (id: string) =>
    apiFetch<{ success: boolean }>(`/contacts/${id}`, { method: 'DELETE' }),
  clear: () => apiFetch<{ removed: number }>('/contacts', { method: 'DELETE' }),
};

// ─── Campaigns resource (metered) ────────────────────────────────
export interface Campaign {
  id: string;
  channel: 'sms' | 'wa' | 'ivr';
  name: string;
  message: string;
  recipientCount: number;
  creditsUsed: number;
  status: string;
  stats: { delivered: number; failed: number; pending: number };
  createdAt: string;
}

export const campaignsApi = {
  list: () => apiFetch<Campaign[]>('/campaigns'),
  listAll: () => apiFetch<(Campaign & { ownerId: string })[]>('/campaigns/all'),
  adminCreate: (data: {
    candidateName: string;
    channel: 'sms' | 'wa' | 'ivr';
    name: string;
    recipientCount: number;
    status?: 'Scheduled';
  }) => apiFetch<Campaign>('/campaigns/admin', { method: 'POST', body: JSON.stringify(data) }),
  send: (data: {
    channel: 'sms' | 'wa' | 'ivr';
    message: string;
    name?: string;
    recipientCount?: number;
  }) =>
    apiFetch<{ campaign: Campaign; balances: { sms: number; wa: number; ivr: number } }>(
      '/campaigns',
      { method: 'POST', body: JSON.stringify(data) },
    ),
};

// ─── Billing resource ────────────────────────────────────────────
export interface Payment {
  id: string;
  paymentId?: string;
  packageName: string;
  amount: number;
  credits: { sms: number; wa: number; ivr: number };
  status: string;
  createdAt: string;
}

export const billingApi = {
  payments: () => apiFetch<Payment[]>('/billing/payments'),
  allPayments: () => apiFetch<(Payment & { ownerId: string })[]>('/billing/all-payments'),
  topup: (data: { grant: string; signature: string }) =>
    apiFetch<{ payment: Payment; balances: { sms: number; wa: number; ivr: number } }>(
      '/billing/topup',
      { method: 'POST', body: JSON.stringify(data) },
    ),
};

// ─── Admin: Voter CRM ────────────────────────────────────────────
export interface Voter {
  id: string;
  name: string;
  mobile: string;
  gender?: string;
  age?: number;
  area?: string;
  inclination?: string;
  segment?: string;
  [key: string]: any;
}

export const votersApi = {
  list: () => apiFetch<Voter[]>('/admin/voters'),
  create: (data: Partial<Voter>) =>
    apiFetch<Voter>('/admin/voters', { method: 'POST', body: JSON.stringify(data) }),
  importMany: (voters: Partial<Voter>[]) =>
    apiFetch<{ added: number; voters: Voter[] }>('/admin/voters/import', {
      method: 'POST',
      body: JSON.stringify({ voters }),
    }),
  update: (id: string, patch: Partial<Voter>) =>
    apiFetch<Voter>(`/admin/voters/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  remove: (id: string) =>
    apiFetch<{ success: boolean }>(`/admin/voters/${id}`, { method: 'DELETE' }),
};

// ─── Admin: DLT template approvals ───────────────────────────────
export interface TemplateReq {
  id: string;
  candidate: string;
  district: string;
  message: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  date: string;
  messageType?: string;
  templateName?: string;
}

export const templatesApi = {
  list: () => apiFetch<TemplateReq[]>('/admin/templates'),
  setStatus: (id: string, status: 'Approved' | 'Rejected' | 'Pending') =>
    apiFetch<TemplateReq>(`/admin/templates/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

// ─── Support desk ────────────────────────────────────────────────
export interface SupportCustomer {
  id: string;
  name: string;
  mobile: string; // already masked by the server
  status: string;
  balances: { sms: number; wa: number; ivr: number };
  payments: number;
  contacts: number;
  district?: string;
  area?: string;
}

export interface TicketNote {
  author: string;
  role: 'customer' | 'support' | 'admin';
  text: string;
  at: string;
}

export interface Ticket {
  id: string;
  customerId: string;
  customerName: string;
  subject: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In-Progress' | 'Resolved';
  notes: TicketNote[];
  createdBy: string;
  createdByRole: 'customer' | 'support' | 'admin';
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export const supportApi = {
  login: (email: string, password: string) =>
    apiFetch<{ success: boolean; token: string; agent: { id: string; name: string; email: string } }>(
      '/support/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    ),
  customers: () => apiFetch<SupportCustomer[]>('/support/customers'),
  customer: (id: string) => apiFetch<SupportCustomer>(`/support/customers/${id}`),
  // Admin-only agent management
  agents: () => apiFetch<any[]>('/support/agents'),
  createAgent: (data: { name: string; email: string; password: string }) =>
    apiFetch<any>('/support/agents', { method: 'POST', body: JSON.stringify(data) }),
  removeAgent: (id: string) =>
    apiFetch<{ success: boolean }>(`/support/agents/${id}`, { method: 'DELETE' }),
};

export const ticketsApi = {
  // Customer
  mine: () => apiFetch<Ticket[]>('/tickets/mine'),
  raise: (data: { subject: string; description: string; priority?: string }) =>
    apiFetch<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(data) }),
  reply: (id: string, text: string) =>
    apiFetch<Ticket>(`/tickets/${id}/reply`, { method: 'POST', body: JSON.stringify({ text }) }),
  // Support / admin
  all: () => apiFetch<Ticket[]>('/tickets'),
  createForCustomer: (data: {
    customerId?: string;
    customerMobile?: string;
    subject: string;
    description: string;
    priority?: string;
  }) => apiFetch<Ticket>('/tickets/support', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, patch: { status?: string; priority?: string; assignedTo?: string | null }) =>
    apiFetch<Ticket>(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  addNote: (id: string, text: string) =>
    apiFetch<Ticket>(`/tickets/${id}/notes`, { method: 'POST', body: JSON.stringify({ text }) }),
};

export { apiFetch };
