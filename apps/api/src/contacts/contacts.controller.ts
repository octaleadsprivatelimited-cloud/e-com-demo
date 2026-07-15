import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContactsService } from './contacts.service';
import { CandidatesService } from '../candidates/candidates.service';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(
    private readonly contacts: ContactsService,
    private readonly candidates: CandidatesService,
  ) {}

  /** Resolve the tenant (owner) id from the authenticated token (self-healing). */
  private async ownerId(req: any): Promise<string> {
    return (await this.candidates.ensureFromUser(req.user || {})).id;
  }

  @Get()
  async list(@Req() req: any) {
    return this.contacts.listForOwner(await this.ownerId(req));
  }

  @Post()
  async add(@Req() req: any, @Body() body: any) {
    if (!body?.mobile) throw new BadRequestException('mobile is required');
    return this.contacts.addForOwner(await this.ownerId(req), body);
  }

  @Post('bulk')
  async bulk(@Req() req: any, @Body() body: any) {
    const items = Array.isArray(body?.contacts) ? body.contacts : [];
    if (!items.length) throw new BadRequestException('contacts[] is required');
    const added = await this.contacts.addManyForOwner(await this.ownerId(req), items);
    return { added: added.length, contacts: added };
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    return { success: await this.contacts.removeForOwner(await this.ownerId(req), id) };
  }

  @Delete()
  async clear(@Req() req: any) {
    return { removed: await this.contacts.clearForOwner(await this.ownerId(req)) };
  }
}
