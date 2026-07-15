import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../auth/auth.service';
import { AdminGuard } from '../auth/admin.guard';
import { SupportGuard } from '../auth/support.guard';
import { AuditService } from '../common/audit.service';
import { SupportAgentsService } from './support-agents.service';
import { CandidatesService } from '../candidates/candidates.service';
import type { Candidate } from '../candidates/candidates.service';

function maskMobile(mobile?: string): string {
  if (!mobile || mobile.length < 6) return '***';
  return `${mobile.slice(0, 4)}***${mobile.slice(-2)}`;
}

/** Reduced, PII-masked projection — NO credentials, NO contact lists, NO export. */
function overview(c: Candidate) {
  return {
    id: c.id,
    name: c.name,
    mobile: maskMobile(c.mobile),
    status: c.status,
    balances: c.balances,
    payments: c.payments,
    contacts: c.contacts,
    district: c.district,
    area: c.area,
  };
}

@Controller('support')
export class SupportController {
  constructor(
    private readonly auth: AuthService,
    private readonly agents: SupportAgentsService,
    private readonly candidates: CandidatesService,
    private readonly audit: AuditService,
  ) {}

  // ─── Support agent authentication ─────────────────────────────
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    const agent = await this.agents.verify(body?.email || '', body?.password || '');
    if (!agent) {
      this.audit.log('support.login.failure', { email: body?.email });
      throw new UnauthorizedException('Invalid email or password.');
    }
    const token = this.auth.issueToken({
      id: agent.id,
      mobile: agent.email,
      role: 'support',
      name: agent.name,
    });
    this.audit.log('support.login.success', { agent: agent.email });
    return { success: true, token, agent: { id: agent.id, name: agent.name, email: agent.email } };
  }

  // ─── Read-only customer overview (masked, no export) ──────────
  @Get('customers')
  @UseGuards(SupportGuard)
  async listCustomers() {
    return (await this.candidates.findAll()).map(overview);
  }

  @Get('customers/:id')
  @UseGuards(SupportGuard)
  async getCustomer(@Param('id') id: string) {
    const c = await this.candidates.findById(id);
    if (!c) throw new BadRequestException('Customer not found');
    return overview(c);
  }

  // ─── Admin: manage support agents ─────────────────────────────
  @Get('agents')
  @UseGuards(AdminGuard)
  listAgents() {
    return this.agents.listSafe();
  }

  @Post('agents')
  @UseGuards(AdminGuard)
  async createAgent(@Body() body: any) {
    if (!body?.name || !body?.email || !body?.password) {
      throw new BadRequestException('name, email and password are required');
    }
    return this.agents.create(body);
  }

  @Patch('agents/:id')
  @UseGuards(AdminGuard)
  async setActive(@Param('id') id: string, @Body() body: any) {
    return { success: await this.agents.setActive(id, body?.active !== false) };
  }

  @Delete('agents/:id')
  @UseGuards(AdminGuard)
  async removeAgent(@Param('id') id: string) {
    return { success: await this.agents.remove(id) };
  }
}
