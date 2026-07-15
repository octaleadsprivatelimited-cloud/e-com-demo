import { Injectable, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { EntityRepository } from '../common/entity.repository';

export interface SupportAgent {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  active: boolean;
  createdAt: string;
}

const COLLECTION = 'support_agents';

@Injectable()
export class SupportAgentsService implements OnModuleInit {
  constructor(private readonly repo: EntityRepository) {}

  async onModuleInit(): Promise<void> {
    // Seed one demo agent if none exist (password: support123 — change it).
    await this.repo.seedIfEmpty<SupportAgent>(COLLECTION, [
      {
        id: 'SUP-001',
        name: 'Aarti Support',
        email: 'support@poltica.in',
        passwordHash: await bcrypt.hash('support123', 10),
        active: true,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  /** Public listing — never exposes password hashes. */
  async listSafe(): Promise<Omit<SupportAgent, 'passwordHash'>[]> {
    const all = await this.repo.all<SupportAgent>(COLLECTION);
    return all.map(({ passwordHash, ...rest }) => rest);
  }

  async verify(email: string, password: string): Promise<SupportAgent | null> {
    // Email is stored lowercased, so the indexed lookup is case-insensitive.
    const agent = await this.repo.findBy<SupportAgent>(
      COLLECTION,
      'email',
      String(email || '').toLowerCase(),
    );
    if (!agent || !agent.active) return null;
    const ok = await bcrypt.compare(String(password || ''), agent.passwordHash);
    return ok ? agent : null;
  }

  async create(input: { name: string; email: string; password: string }): Promise<Omit<SupportAgent, 'passwordHash'>> {
    const agent: SupportAgent = {
      id: `SUP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1e6).toString(36).toUpperCase()}`,
      name: input.name,
      email: String(input.email || '').toLowerCase(),
      passwordHash: await bcrypt.hash(input.password, 10),
      active: true,
      createdAt: new Date().toISOString(),
    };
    await this.repo.insert(COLLECTION, agent);
    const { passwordHash, ...safe } = agent;
    return safe;
  }

  async setActive(id: string, active: boolean): Promise<boolean> {
    const updated = await this.repo.patch<SupportAgent>(COLLECTION, id, { active });
    return !!updated;
  }

  remove(id: string): Promise<boolean> {
    return this.repo.remove(COLLECTION, id);
  }
}
