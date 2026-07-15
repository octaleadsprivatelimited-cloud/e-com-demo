import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { TemplatesService } from './templates.service';
import type { TemplateReq } from './templates.service';

@Controller('admin/templates')
@UseGuards(AdminGuard)
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  list() {
    return this.templates.list();
  }

  @Post()
  create(@Body() body: any) {
    return this.templates.create(body);
  }

  @Patch(':id/status')
  async setStatus(@Param('id') id: string, @Body() body: any) {
    const status = body?.status as TemplateReq['status'];
    if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
      throw new BadRequestException('status must be Approved | Rejected | Pending');
    }
    const updated = await this.templates.setStatus(id, status);
    if (!updated) throw new NotFoundException(`Template ${id} not found`);
    return updated;
  }
}
