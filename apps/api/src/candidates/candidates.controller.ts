import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CandidatesService } from './candidates.service';
import type { Candidate } from './candidates.service';

@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidates: CandidatesService) {}

  /** Full roster (contains balances etc.) — ADMIN ONLY. */
  @Get()
  @UseGuards(AdminGuard)
  findAll(): Promise<Candidate[]> {
    return this.candidates.findAll();
  }

  /** The currently authenticated candidate's own record. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: any): Promise<Candidate> {
    const user = req.user;
    const found = user.mobile
      ? await this.candidates.findByMobile(user.mobile)
      : await this.candidates.findById(user.id);
    if (!found) throw new NotFoundException('Candidate profile not found');
    return found;
  }

  /** Read an arbitrary candidate — ADMIN ONLY. */
  @Get(':id')
  @UseGuards(AdminGuard)
  async findOne(@Param('id') id: string): Promise<Candidate> {
    const found = await this.candidates.findById(id);
    if (!found) throw new NotFoundException(`Candidate ${id} not found`);
    return found;
  }

  /**
   * Create/sync a candidate. Any authenticated user may create, but a
   * non-admin is confined to their OWN identity (can't create records for
   * other people). Admin (add-candidate) may create anything.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: any, @Body() body: any): Promise<Candidate> {
    if (req.user?.role !== 'admin') {
      // Explicit allowlist: customers cannot mass-assign balances, payment
      // totals, status, IDs, credentials, or administrative fields.
      body = {
        mobile: req.user?.mobile,
        name: typeof body?.name === 'string' ? body.name : undefined,
        district: typeof body?.district === 'string' ? body.district : undefined,
        area: typeof body?.area === 'string' ? body.area : undefined,
        state: typeof body?.state === 'string' ? body.state : undefined,
        pincode: typeof body?.pincode === 'string' ? body.pincode : undefined,
        status: 'Active',
        balances: { sms: 0, wa: 0, ivr: 0 },
        payments: 0,
        contacts: 0,
      };
    }
    return this.candidates.create(body);
  }

  /** Mutate an arbitrary candidate (credits, status, config) — ADMIN ONLY. */
  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() body: any): Promise<Candidate> {
    return this.candidates.update(id, body);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.candidates.remove(id);
    return { success: true };
  }
}
