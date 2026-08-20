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
    // Permanently disable the legacy source-known demo identity if it exists.
    const legacy = await this.repo.findById<SupportAgent>(COLLECTION, 'SUP-001');
    if (legacy?.email === 'support@poltica.in') {
      await this.repo.patch(COLLECTION, legacy.id, { active: false });
    }

    // Demo provisioning is opt-in, development-only, and requires a secret
    // supplied outside source control. Production never seeds privileged users.
    if (process.env.NODE_ENV !== 'production' && process.env.SEED_DEMO_SUPPORT === 'true') {
      const password = process.env.DEMO_SUPPORT_PASSWORD;
      if (!password || password.length < 12) {
        throw new Error('DEMO_SUPPORT_PASSWORD must contain at least 12 characters.');
      }
      await this.repo.seedIfEmpty<SupportAgent>(COLLECTION, [{
        id: 'SUP-DEMO', name: 'Demo Support', email: 'support-demo@poltica.invalid',
        passwordHash: await bcrypt.hash(password, 12), active: true,
        createdAt: new Date().toISOString(),
      }]);
    }
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
