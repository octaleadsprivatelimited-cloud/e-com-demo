import { Injectable, OnModuleInit } from '@nestjs/common';
import { EntityRepository } from '../common/entity.repository';

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

const COLLECTION = 'admin_voters';

@Injectable()
export class VotersService implements OnModuleInit {
  constructor(private readonly repo: EntityRepository) {}

  private static newId(): string {
    return `VOT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1e6).toString(36).toUpperCase()}`;
  }

  async onModuleInit(): Promise<void> {
    await this.repo.seedIfEmpty<Voter>(COLLECTION, [
      { id: 'VOT-0101', name: 'Sanjay Deshpande', mobile: '9823012345', gender: 'Male', age: 34, area: 'Sadashiv Peth', inclination: 'Strong Support', segment: 'Trader' },
      { id: 'VOT-0102', name: 'Sunita Kulkarni', mobile: '9823054321', gender: 'Female', age: 52, area: 'Sadashiv Peth', inclination: 'Leaning Support', segment: 'Women' },
      { id: 'VOT-0103', name: 'Dnyaneshwar Patil', mobile: '9977011223', gender: 'Male', age: 62, area: 'Karad North', inclination: 'Undecided', segment: 'Farmer' },
      { id: 'VOT-0104', name: 'Anjali Shinde', mobile: '9422055667', gender: 'Female', age: 24, area: 'Nashik East', inclination: 'Strong Support', segment: 'Youth' },
      { id: 'VOT-0105', name: 'Ketan Mehta', mobile: '9890123456', gender: 'Male', age: 71, area: 'Nagpur South', inclination: 'Opposed', segment: 'Senior Citizen' },
      { id: 'VOT-0106', name: 'Pooja Gokhale', mobile: '9021234567', gender: 'Female', age: 29, area: 'Sadashiv Peth', inclination: 'Leaning Support', segment: 'Youth' },
    ]);
  }

  /** Voter roll, newest first, paginated (can be very large). */
  list(limit = 5000, offset = 0): Promise<Voter[]> {
    return this.repo.all<Voter>(COLLECTION, limit, offset);
  }

  create(data: Partial<Voter>): Promise<Voter> {
    const voter: Voter = {
      ...data,
      id: data.id || VotersService.newId(),
      name: data.name || 'Unnamed',
      mobile: String(data.mobile || ''),
    } as Voter;
    return this.repo.insert(COLLECTION, voter);
  }

  /** Bulk import in batched multi-row inserts (scales to large voter rolls). */
  createMany(items: Partial<Voter>[]): Promise<Voter[]> {
    const rows = items.map(
      (d) =>
        ({
          ...d,
          id: d.id || VotersService.newId(),
          name: d.name || 'Unnamed',
          mobile: String(d.mobile || ''),
        }) as Voter,
    );
    return this.repo.insertMany(COLLECTION, rows);
  }

  update(id: string, patch: Partial<Voter>): Promise<Voter | undefined> {
    // Never let a patch rewrite the primary key.
    const { id: _ignore, ...safe } = patch;
    return this.repo.patch<Voter>(COLLECTION, id, safe);
  }

  remove(id: string): Promise<boolean> {
    return this.repo.remove(COLLECTION, id);
  }
}
