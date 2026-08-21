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
import { BillingService } from './billing.service';
import { CandidatesService } from '../candidates/candidates.service';
import { AuditService } from '../common/audit.service';
import * as crypto from 'crypto';

const PACKAGES = {
  sms_booster: { name: 'SMS Booster', amount: 10000, credits: { sms: 50000, wa: 0, ivr: 0 } },
  ivr_booster: { name: 'IVR Booster', amount: 15000, credits: { sms: 0, wa: 0, ivr: 20000 } },
  wa_booster: { name: 'WhatsApp Booster', amount: 8000, credits: { sms: 0, wa: 10000, ivr: 0 } },
  all_in_one: { name: 'All One Package', amount: 12000, credits: { sms: 10000, wa: 5000, ivr: 5000 } },
} as const;

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly candidates: CandidatesService,
    private readonly audit: AuditService,
  ) {}

  private owner(req: any) {
    // Self-heal: guarantee the customer has a server record so a purchased
    // credit top-up is never lost, even if their signup didn't sync.
    return this.candidates.ensureFromUser(req.user || {});
  }

  @Get('payments')
  @UseGuards(CustomerGuard)
  async payments(@Req() req: any) {
    const owner = await this.owner(req);
    return this.billing.listForOwner(owner.id);
  }

  /** Admin: all payments across tenants. */
  @Get('all-payments')
  allPayments(@Req() req: any) {
    if (req.user?.role !== 'admin') throw new ForbiddenException('Admin only');
    return this.billing.listAll();
  }

  /** Finalize a server-verified Razorpay payment grant exactly once. */
  @Post('topup')
  @UseGuards(CustomerGuard)
  async topup(@Req() req: any, @Body() body: any) {
    const owner = await this.owner(req);
    const grant = String(body?.grant || '');
    const signature = String(body?.signature || '');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    if (!grant || !signature || secret.length < 16) throw new BadRequestException('Verified payment grant is required.');
    const expected = crypto.createHmac('sha256', secret).update(grant).digest('hex');
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new ForbiddenException('Invalid payment grant.');

    let claim: any;
    try { claim = JSON.parse(Buffer.from(grant, 'base64url').toString('utf8')); }
    catch { throw new BadRequestException('Malformed payment grant.'); }
    if (claim?.sub !== req.user?.id || claim?.exp < Date.now() || !claim?.paymentId) {
      throw new ForbiddenException('Payment grant is expired or belongs to another account.');
    }
    const pkg = PACKAGES[claim.packageId as keyof typeof PACKAGES];
    if (!pkg) throw new BadRequestException('Unknown payment package.');

    const result = await this.billing.finalizeVerified({
      ownerId: owner.id, paymentId: String(claim.paymentId), packageName: pkg.name,
      amount: pkg.amount, credits: { ...pkg.credits },
    });
    this.audit.log(result.duplicate ? 'billing.topup.replay' : 'billing.topup', {
      ownerId: owner.id, paymentId: claim.paymentId, packageId: claim.packageId,
    });
    return { payment: result.payment, balances: result.candidate.balances, duplicate: result.duplicate };
  }
}
