import { Injectable } from '@nestjs/common';
import { EntityRepository } from '../common/entity.repository';

export interface Payment {
  id: string;
  ownerId: string;
  paymentId?: string;
  packageName: string;
  amount: number;
  credits: { sms: number; wa: number; ivr: number };
  status: 'Success' | 'Failed';
  createdAt: string;
}

const COLLECTION = 'payments';

@Injectable()
export class BillingService {
  constructor(private readonly repo: EntityRepository) {}

  /** A tenant's payments, newest first (indexed by ownerId), paginated. */
  listForOwner(ownerId: string, limit = 5000, offset = 0): Promise<Payment[]> {
    return this.repo.findManyBy<Payment>(COLLECTION, 'ownerId', ownerId, limit, offset);
  }

  /** All payments across every tenant (admin view), newest first, paginated. */
  listAll(limit = 5000, offset = 0): Promise<Payment[]> {
    return this.repo.all<Payment>(COLLECTION, limit, offset);
  }

  record(input: Omit<Payment, 'id' | 'createdAt' | 'status'> & { status?: Payment['status'] }): Promise<Payment> {
    const payment: Payment = {
      id: `TXN-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1e6).toString(36).toUpperCase()}`,
      status: 'Success',
      createdAt: new Date().toISOString(),
      ...input,
    };
    return this.repo.insert(COLLECTION, payment);
  }

  finalizeVerified(input: {
    ownerId: string;
    paymentId: string;
    packageName: string;
    amount: number;
    credits: { sms: number; wa: number; ivr: number };
  }) {
    const payment: Payment = {
      id: `RZP-${input.paymentId}`,
      ownerId: input.ownerId,
      paymentId: input.paymentId,
      packageName: input.packageName,
      amount: input.amount,
      credits: input.credits,
      status: 'Success',
      createdAt: new Date().toISOString(),
    };
    return this.repo.finalizePayment({
      candidateCollection: 'candidates', candidateId: input.ownerId,
      paymentCollection: COLLECTION, payment, credits: input.credits, amount: input.amount,
    });
  }
}
