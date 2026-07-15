import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CandidatesModule } from '../candidates/candidates.module';
import { SupportController } from './support.controller';
import { TicketsController } from './tickets.controller';
import { SupportAgentsService } from './support-agents.service';
import { TicketsService } from './tickets.service';

@Module({
  imports: [AuthModule, CandidatesModule],
  controllers: [SupportController, TicketsController],
  providers: [SupportAgentsService, TicketsService],
})
export class SupportModule {}
