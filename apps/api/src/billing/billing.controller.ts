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
import { BillingService } from './billing.service';
import { CandidatesService } from '../candidates/candidates.service';
import { AuditService } from '../common/audit.service';

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

  /**
   * Credit the tenant's balance after a successful payment and record the
   * transaction. NOTE: for production this should be driven by the verified
   * Razorpay webhook rather than a client call, so credits can never be forged.
   */
  @Post('topup')
  async topup(@Req() req: any, @Body() body: any) {
    const owner = await this.owner(req);
    const credits = {
      sms: Math.max(0, Math.floor(Number(body?.sms) || 0)),
      wa: Math.max(0, Math.floor(Number(body?.wa) || 0)),
      ivr: Math.max(0, Math.floor(Number(body?.ivr) || 0)),
    };
    const amount = Math.max(0, Number(body?.amount) || 0);
    if (credits.sms + credits.wa + credits.ivr <= 0) {
      throw new BadRequestException('At least one of sms / wa / ivr credits is required.');
    }

    const updated = await this.candidates.adjustBalances(owner.id, credits);
    await this.candidates.addPaymentTotal(owner.id, amount);
    const payment = await this.billing.record({
      ownerId: owner.id,
      paymentId: body?.paymentId,
      packageName: body?.packageName || 'Credit Purchase',
      amount,
      credits,
    });

    this.audit.log('billing.topup', { ownerId: owner.id, amount, credits });
    return { payment, balances: updated.balances };
  }
}
