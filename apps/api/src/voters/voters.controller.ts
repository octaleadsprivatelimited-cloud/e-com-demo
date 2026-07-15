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
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { VotersService } from './voters.service';

@Controller('admin/voters')
@UseGuards(AdminGuard)
export class VotersController {
  constructor(private readonly voters: VotersService) {}

  @Get()
  list() {
    return this.voters.list();
  }

  @Post()
  create(@Body() body: any) {
    if (!body?.name || !body?.mobile) {
      throw new BadRequestException('name and mobile are required');
    }
    return this.voters.create(body);
  }

  @Post('import')
  async importMany(@Body() body: any) {
    const items = Array.isArray(body?.voters) ? body.voters : [];
    if (!items.length) throw new BadRequestException('voters[] is required');
    const added = await this.voters.createMany(items);
    return { added: added.length, voters: added };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return (await this.voters.update(id, body)) || { success: false };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return { success: await this.voters.remove(id) };
  }
}
