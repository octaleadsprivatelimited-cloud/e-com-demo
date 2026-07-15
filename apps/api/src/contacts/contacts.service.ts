import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EntityRepository } from '../common/entity.repository';

export interface Contact {
  id: string;
  ownerId: string;
  name: string;
  mobile: string;
  tag?: string;
  createdAt: string;
}

const COLLECTION = 'contacts';

/**
 * Per-row, indexed contact store. Contacts are the collection that grows to
 * crore-scale (each tenant can hold lakhs of voters), so every operation here
 * touches only the owner's indexed rows — never the whole table.
 *
 * The id is DETERMINISTIC — `CT-<ownerId>-<mobile>` — so re-adding the same
 * mobile for the same tenant collapses onto the same row. That gives us
 * de-duplication enforced by the primary key with zero prior reads, which is
 * what makes bulk imports of lakhs of rows cheap and idempotent.
 */
@Injectable()
export class ContactsService implements OnModuleInit {
  private readonly logger = new Logger('Contacts');

  constructor(private readonly repo: EntityRepository) {}

  private static idFor(ownerId: string, mobile: string): string {
    return `CT-${ownerId}-${String(mobile).replace(/\D/g, '')}`;
  }

  /**
   * One-time reconciliation: legacy rows (migrated from the old blob store) used
   * random ids, so the same (owner, mobile) could exist under an id that our
   * deterministic key wouldn't collapse onto — producing duplicates. Re-key any
   * such row to its deterministic id (upsert collapses same-mobile duplicates)
   * and drop the stale row. Only rows whose id already differs are touched, so
   * once reconciled this is a no-op.
   */
  async onModuleInit(): Promise<void> {
    // Phase 1 (read-only, paged): find rows whose id isn't yet canonical.
    const stale: Contact[] = [];
    let offset = 0;
    for (;;) {
      const page = await this.repo.all<Contact>(COLLECTION, 1000, offset);
      if (!page.length) break;
      for (const c of page) {
        if (c.id !== ContactsService.idFor(c.ownerId, c.mobile)) stale.push(c);
      }
      if (page.length < 1000) break;
      offset += 1000;
    }
    if (!stale.length) return;

    // Phase 2 (mutate): upsert under the canonical id (collapses same-mobile
    // duplicates), then drop the stale row.
    for (const c of stale) {
      await this.repo.insert(COLLECTION, { ...c, id: ContactsService.idFor(c.ownerId, c.mobile) });
      await this.repo.remove(COLLECTION, c.id);
    }
    this.logger.log(`Reconciled ${stale.length} legacy contact id(s) to deterministic keys.`);
  }

  /** Contacts belonging to a single tenant (owner), newest first, paginated. */
  listForOwner(ownerId: string, limit = 5000, offset = 0): Promise<Contact[]> {
    return this.repo.findManyBy<Contact>(COLLECTION, 'ownerId', ownerId, limit, offset);
  }

  countForOwner(ownerId: string): Promise<number> {
    return this.repo.countBy(COLLECTION, 'ownerId', ownerId);
  }

  async addForOwner(
    ownerId: string,
    input: { name?: string; mobile: string; tag?: string },
  ): Promise<Contact> {
    const mobile = String(input.mobile).trim();
    const contact: Contact = {
      id: ContactsService.idFor(ownerId, mobile),
      ownerId,
      name: input.name?.trim() || 'Unnamed',
      mobile,
      tag: input.tag,
      createdAt: new Date().toISOString(),
    };
    return this.repo.insert(COLLECTION, contact);
  }

  /**
   * Bulk import; de-duplicates by mobile within the tenant via the deterministic
   * id + ON CONFLICT, in batched multi-row inserts. Returns only newly-added rows.
   */
  async addManyForOwner(
    ownerId: string,
    items: Array<{ name?: string; mobile: string; tag?: string }>,
  ): Promise<Contact[]> {
    const now = new Date().toISOString();
    const contacts: Contact[] = [];
    for (const item of items) {
      const mobile = String(item.mobile || '').trim();
      if (!mobile) continue;
      contacts.push({
        id: ContactsService.idFor(ownerId, mobile),
        ownerId,
        name: item.name?.trim() || 'Unnamed',
        mobile,
        tag: item.tag,
        createdAt: now,
      });
    }
    return this.repo.insertMany(COLLECTION, contacts);
  }

  /** Remove one contact, enforcing tenant ownership. */
  async removeForOwner(ownerId: string, id: string): Promise<boolean> {
    const found = await this.repo.findById<Contact>(COLLECTION, id);
    if (!found || found.ownerId !== ownerId) return false;
    return this.repo.remove(COLLECTION, id);
  }

  clearForOwner(ownerId: string): Promise<number> {
    return this.repo.removeManyBy(COLLECTION, 'ownerId', ownerId);
  }
}
