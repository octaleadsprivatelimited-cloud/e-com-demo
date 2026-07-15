import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { EntityRepository } from '../common/entity.repository';

export interface Candidate {
  id: string;
  name: string;
  district?: string;
  area?: string;
  state?: string;
  pincode?: string;
  mobile: string;
  status: 'Active' | 'Suspended' | 'Pending';
  balances: { sms: number; wa: number; ivr: number };
  payments: number;
  contacts: number;
  uniqueUrl?: string;
  manifestoUrl?: string;
  brochureUrl?: string;
  [key: string]: any;
}

const COLLECTION = 'candidates';

@Injectable()
export class CandidatesService implements OnModuleInit {
  constructor(private readonly repo: EntityRepository) {}

  async onModuleInit(): Promise<void> {
    await this.repo.seedIfEmpty<Candidate>(COLLECTION, [
      {
        id: 'CAN-001', name: 'Rahul Sharma', district: 'Pune', area: 'Sadashiv Peth',
        state: 'Maharashtra', pincode: '411030', mobile: '9876543210', status: 'Active',
        balances: { sms: 95000, ivr: 50000, wa: 12000 }, payments: 23000, contacts: 45000,
        uniqueUrl: 'poltica.in-sadashiv-peth-rahul-sharma', manifestoUrl: '', brochureUrl: '',
      },
      {
        id: 'CAN-002', name: 'Priya Singh', district: 'Nashik', area: 'Nashik East',
        state: 'Maharashtra', pincode: '422101', mobile: '9876543211', status: 'Active',
        balances: { sms: 100000, ivr: 50000, wa: 0 }, payments: 25000, contacts: 85000,
        uniqueUrl: 'poltica.in-nashik-east-priya-singh', manifestoUrl: '', brochureUrl: '',
      },
    ]);
  }

  findAll(): Promise<Candidate[]> {
    return this.repo.all<Candidate>(COLLECTION);
  }

  findById(id: string): Promise<Candidate | undefined> {
    return this.repo.findById<Candidate>(COLLECTION, id);
  }

  findByMobile(mobile: string): Promise<Candidate | undefined> {
    return this.repo.findBy<Candidate>(COLLECTION, 'mobile', mobile);
  }

  async create(data: Partial<Candidate>): Promise<Candidate> {
    // Idempotent by id or mobile (self-heal safe to call repeatedly).
    const existing =
      (data.id && (await this.findById(data.id))) ||
      (data.mobile && (await this.findByMobile(data.mobile)));
    if (existing) return existing;

    const candidate: Candidate = {
      id: data.id || `CAN-${Math.floor(100 + Math.random() * 900)}`,
      name: data.name || 'Unnamed',
      mobile: data.mobile || '',
      status: (data.status as Candidate['status']) || 'Active',
      balances: data.balances || { sms: 0, wa: 0, ivr: 0 },
      payments: data.payments ?? 0,
      contacts: data.contacts ?? 0,
      ...data,
    } as Candidate;
    return this.repo.insert(COLLECTION, candidate);
  }

  async update(id: string, patch: Partial<Candidate>): Promise<Candidate> {
    const updated = await this.repo.patch<Candidate>(COLLECTION, id, patch);
    if (!updated) throw new NotFoundException(`Candidate ${id} not found`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const ok = await this.repo.remove(COLLECTION, id);
    if (!ok) throw new NotFoundException(`Candidate ${id} not found`);
  }

  /** Resolve the candidate for an authenticated user, creating one if missing. */
  async ensureFromUser(user: { id?: string; mobile?: string; name?: string }): Promise<Candidate> {
    const found =
      (user.id && (await this.findById(user.id))) ||
      (user.mobile && (await this.findByMobile(user.mobile)));
    if (found) return found;
    return this.create({
      id: user.id,
      mobile: user.mobile || '',
      name: user.name || 'Candidate',
      status: 'Active',
      balances: { sms: 0, wa: 0, ivr: 0 },
    });
  }

  /** Apply a signed delta to channel balances (single-row update). */
  async adjustBalances(
    id: string,
    delta: Partial<{ sms: number; wa: number; ivr: number }>,
  ): Promise<Candidate> {
    const c = await this.findById(id);
    if (!c) throw new NotFoundException(`Candidate ${id} not found`);
    const src = c.balances || { sms: 0, wa: 0, ivr: 0 };
    const balances = { sms: src.sms || 0, wa: src.wa || 0, ivr: src.ivr || 0 };
    for (const k of ['sms', 'wa', 'ivr'] as const) {
      if (delta[k]) balances[k] = Math.max(0, (balances[k] || 0) + (delta[k] as number));
    }
    return this.update(id, { balances });
  }

  async addPaymentTotal(id: string, amount: number): Promise<Candidate> {
    const c = await this.findById(id);
    if (!c) throw new NotFoundException(`Candidate ${id} not found`);
    return this.update(id, { payments: (c.payments || 0) + amount });
  }
}
