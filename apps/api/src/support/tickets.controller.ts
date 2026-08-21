import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SupportGuard } from '../auth/support.guard';
import { CustomerGuard } from '../auth/customer.guard';
import { TicketsService } from './tickets.service';
import { CandidatesService } from '../candidates/candidates.service';
import { AuditService } from '../common/audit.service';

@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly tickets: TicketsService,
    private readonly candidates: CandidatesService,
    private readonly audit: AuditService,
  ) {}

  // ─── Customer: raise & view own complaints ────────────────────
  @Get('mine')
  @UseGuards(CustomerGuard)
  async mine(@Req() req: any) {
    const me = await this.candidates.ensureFromUser(req.user || {});
    return this.tickets.listForCustomer(me.id);
  }

  @Post()
  @UseGuards(CustomerGuard)
  async raise(@Req() req: any, @Body() body: any) {
    if (!body?.subject || !body?.description) {
      throw new BadRequestException('subject and description are required');
    }
    const me = await this.candidates.ensureFromUser(req.user || {});
    const ticket = await this.tickets.create({
      customerId: me.id,
      customerName: me.name,
      subject: body.subject,
      description: body.description,
      priority: body.priority,
      createdBy: me.name,
      createdByRole: 'customer',
    });
    this.audit.log('ticket.created', { by: 'customer', customerId: me.id, ticket: ticket.id });
    return ticket;
  }

  @Post(':id/reply')
  @UseGuards(CustomerGuard)
  async reply(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const me = await this.candidates.ensureFromUser(req.user || {});
    const t = await this.tickets.findById(id);
    if (!t || t.customerId !== me.id) throw new NotFoundException('Ticket not found');
    if (!body?.text) throw new BadRequestException('text is required');
    return this.tickets.addNote(id, {
      author: me.name,
      role: 'customer',
      text: String(body.text),
      at: new Date().toISOString(),
    });
  }

  // ─── Support / Admin: manage all complaints ───────────────────
  @Get()
  @UseGuards(SupportGuard)
  all() {
    return this.tickets.listAll();
  }

  @Post('support')
  @UseGuards(SupportGuard)
  async createForCustomer(@Req() req: any, @Body() body: any) {
    if (!body?.subject || !body?.description) {
      throw new BadRequestException('subject and description are required');
    }
    const customer =
      (body.customerId && (await this.candidates.findById(body.customerId))) ||
      (body.customerMobile && (await this.candidates.findByMobile(body.customerMobile)));
    if (!customer) throw new BadRequestException('Customer not found');
    const ticket = await this.tickets.create({
      customerId: customer.id,
      customerName: customer.name,
      subject: body.subject,
      description: body.description,
      priority: body.priority,
      createdBy: req.user?.name || 'Support',
      createdByRole: req.user?.role === 'admin' ? 'admin' : 'support',
    });
    this.audit.log('ticket.created', { by: req.user?.role, agent: req.user?.name, ticket: ticket.id });
    return ticket;
  }

  @Patch(':id')
  @UseGuards(SupportGuard)
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const patch: any = {};
    if (body?.status) patch.status = body.status;
    if (body?.priority) patch.priority = body.priority;
    if (body?.assignedTo !== undefined) patch.assignedTo = body.assignedTo;
    const updated = await this.tickets.update(id, patch);
    if (!updated) throw new NotFoundException('Ticket not found');
    this.audit.log('ticket.updated', { agent: req.user?.name, ticket: id, patch });
    return updated;
  }

  @Post(':id/notes')
  @UseGuards(SupportGuard)
  async addNote(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    if (!body?.text) throw new BadRequestException('text is required');
    const updated = await this.tickets.addNote(id, {
      author: req.user?.name || 'Support',
      role: req.user?.role === 'admin' ? 'admin' : 'support',
      text: String(body.text),
      at: new Date().toISOString(),
    });
    if (!updated) throw new NotFoundException('Ticket not found');
    return updated;
  }
}
