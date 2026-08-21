import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomerGuard } from '../auth/customer.guard';
import { CampaignsService } from './campaigns.service';
import type { Channel } from './campaigns.service';
import { CandidatesService } from '../candidates/candidates.service';
import { ContactsService } from '../contacts/contacts.service';
import { AuditService } from '../common/audit.service';

const CHANNELS: Channel[] = ['sms', 'wa', 'ivr'];

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(
    private readonly campaigns: CampaignsService,
    private readonly candidates: CandidatesService,
    private readonly contacts: ContactsService,
    private readonly audit: AuditService,
  ) {}

  private owner(req: any) {
    return this.candidates.ensureFromUser(req.user || {});
  }

  @Get()
  @UseGuards(CustomerGuard)
  async list(@Req() req: any) {
    const owner = await this.owner(req);
    return this.campaigns.listForOwner(owner.id);
  }

  /** Admin: all campaigns across tenants. */
  @Get('all')
  listAll(@Req() req: any) {
    if (req.user?.role !== 'admin') throw new ForbiddenException('Admin only');
    return this.campaigns.listAll();
  }

  /**
   * Admin: create/schedule a campaign on behalf of a candidate (no credit
   * deduction — this is an admin-scheduled record, not a live send).
   */
  @Post('admin')
  async adminCreate(@Req() req: any, @Body() body: any) {
    if (req.user?.role !== 'admin') throw new ForbiddenException('Admin only');
    if (!CHANNELS.includes(body?.channel)) {
      throw new BadRequestException('channel must be one of sms | wa | ivr');
    }
    const nameQuery = String(body?.candidateName || '').toLowerCase().trim();
    const all = await this.candidates.findAll();
    const match = all.find((c) => (c.name || '').toLowerCase().trim() === nameQuery);
    const ownerId = match ? match.id : body?.candidateName || 'unassigned';
    return this.campaigns.record({
      ownerId,
      channel: body.channel,
      name: body?.name || 'Campaign',
      message: body?.name || '',
      recipientCount: Math.max(0, Math.floor(Number(body?.recipientCount) || 0)),
      creditsUsed: 0,
      status: body?.status === 'Scheduled' ? 'Scheduled' : undefined,
    });
  }

  /**
   * Create & "send" a campaign. This is the metered core of the product:
   * it verifies the tenant has enough channel credits, deducts them atomically,
   * and records the campaign — so usage genuinely draws down the prepaid balance.
   */
  @Post()
  @UseGuards(CustomerGuard)
  async send(@Req() req: any, @Body() body: any) {
    const owner = await this.owner(req);
    const channel = body?.channel as Channel;
    if (!CHANNELS.includes(channel)) {
      throw new BadRequestException('channel must be one of sms | wa | ivr');
    }
    if (!body?.message || typeof body.message !== 'string') {
      throw new BadRequestException('message is required');
    }
    const language = String(body?.language || 'en');
    if (!['en', 'te', 'hi'].includes(language)) {
      throw new BadRequestException('language must be en, te, or hi');
    }
    if (owner.status === 'Suspended') {
      throw new BadRequestException('Account is suspended. Contact the administrator.');
    }

    // Recipients: explicit count, else the tenant's whole contact list.
    const recipientCount =
      Number.isFinite(Number(body?.recipientCount)) && Number(body.recipientCount) > 0
        ? Math.floor(Number(body.recipientCount))
        : await this.contacts.countForOwner(owner.id);

    if (recipientCount <= 0) {
      throw new BadRequestException('No recipients. Add contacts or provide recipientCount.');
    }

    // 1 credit per recipient on the selected channel.
    const cost = recipientCount;
    const available = owner.balances?.[channel] || 0;
    if (available < cost) {
      throw new BadRequestException(
        `Insufficient ${channel.toUpperCase()} credits: need ${cost}, have ${available}.`,
      );
    }

    // Deduct atomically, then record the campaign.
    const updated = await this.candidates.adjustBalances(owner.id, { [channel]: -cost });
    const campaign = await this.campaigns.record({
      ownerId: owner.id,
      channel,
      name: body.name || `${channel.toUpperCase()} Campaign`,
      message: body.message,
      recipientCount,
      creditsUsed: cost,
      language: language as 'en' | 'te' | 'hi',
    });

    this.audit.log('campaign.sent', {
      ownerId: owner.id,
      channel,
      recipients: recipientCount,
      creditsUsed: cost,
    });

    return { campaign, balances: updated.balances };
  }
}
