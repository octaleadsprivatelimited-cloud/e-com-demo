import { Injectable } from '@nestjs/common';
import { EntityRepository } from '../common/entity.repository';

export type Channel = 'sms' | 'wa' | 'ivr';

export interface Campaign {
  id: string;
  ownerId: string;
  channel: Channel;
  name: string;
  message: string;
  recipientCount: number;
  creditsUsed: number;
  status: 'Sent' | 'Queued' | 'Failed' | 'Scheduled';
  stats: { delivered: number; failed: number; pending: number };
  createdAt: string;
}

const COLLECTION = 'campaigns';

@Injectable()
export class CampaignsService {
  constructor(private readonly repo: EntityRepository) {}

  /** A tenant's campaigns, newest first (indexed by ownerId), paginated. */
  listForOwner(ownerId: string, limit = 5000, offset = 0): Promise<Campaign[]> {
    return this.repo.findManyBy<Campaign>(COLLECTION, 'ownerId', ownerId, limit, offset);
  }

  /** All campaigns across every tenant (admin view), newest first, paginated. */
  listAll(limit = 5000, offset = 0): Promise<Campaign[]> {
    return this.repo.all<Campaign>(COLLECTION, limit, offset);
  }

  record(input: {
    ownerId: string;
    channel: Channel;
    name: string;
    message: string;
    recipientCount: number;
    creditsUsed: number;
    status?: Campaign['status'];
  }): Promise<Campaign> {
    const status = input.status || 'Sent';
    // Simulate realistic delivery outcomes for sent campaigns.
    const delivered = status === 'Sent' ? Math.round(input.recipientCount * 0.94) : 0;
    const failed = status === 'Sent' ? input.recipientCount - delivered : 0;
    const pending = status === 'Queued' ? input.recipientCount : 0;
    const campaign: Campaign = {
      id: `CMP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1e6).toString(36).toUpperCase()}`,
      ownerId: input.ownerId,
      channel: input.channel,
      name: input.name,
      message: input.message,
      recipientCount: input.recipientCount,
      creditsUsed: input.creditsUsed,
      status,
      stats: { delivered, failed, pending },
      createdAt: new Date().toISOString(),
    };
    return this.repo.insert(COLLECTION, campaign);
  }
}
