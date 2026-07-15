import { Injectable } from '@nestjs/common';
import { EntityRepository } from '../common/entity.repository';

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

const COLLECTION = 'tickets';

@Injectable()
export class TicketsService {
  constructor(private readonly repo: EntityRepository) {}

  private static sorted(list: Ticket[]): Ticket[] {
    return [...list].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  async listAll(limit = 5000, offset = 0): Promise<Ticket[]> {
    return TicketsService.sorted(await this.repo.all<Ticket>(COLLECTION, limit, offset));
  }

  /** A customer's tickets (indexed by customerId), most-recently-updated first. */
  async listForCustomer(customerId: string, limit = 5000, offset = 0): Promise<Ticket[]> {
    return TicketsService.sorted(
      await this.repo.findManyBy<Ticket>(COLLECTION, 'customerId', customerId, limit, offset),
    );
  }

  findById(id: string): Promise<Ticket | undefined> {
    return this.repo.findById<Ticket>(COLLECTION, id);
  }

  create(input: {
    customerId: string;
    customerName: string;
    subject: string;
    description: string;
    priority?: Ticket['priority'];
    createdBy: string;
    createdByRole: Ticket['createdByRole'];
  }): Promise<Ticket> {
    const now = new Date().toISOString();
    const ticket: Ticket = {
      id: `TKT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1e6).toString(36).toUpperCase()}`,
      customerId: input.customerId,
      customerName: input.customerName || input.customerId,
      subject: input.subject,
      description: input.description,
      priority: input.priority || 'Medium',
      status: 'Open',
      notes: [],
      createdBy: input.createdBy,
      createdByRole: input.createdByRole,
      assignedTo: null,
      createdAt: now,
      updatedAt: now,
    };
    return this.repo.insert(COLLECTION, ticket);
  }

  update(
    id: string,
    patch: Partial<Pick<Ticket, 'status' | 'priority' | 'assignedTo'>>,
  ): Promise<Ticket | undefined> {
    return this.repo.patch<Ticket>(COLLECTION, id, { ...patch, updatedAt: new Date().toISOString() });
  }

  async addNote(id: string, note: TicketNote): Promise<Ticket | undefined> {
    const ticket = await this.repo.findById<Ticket>(COLLECTION, id);
    if (!ticket) return undefined;
    const notes = [...(ticket.notes || []), note];
    return this.repo.patch<Ticket>(COLLECTION, id, { notes, updatedAt: new Date().toISOString() });
  }
}
