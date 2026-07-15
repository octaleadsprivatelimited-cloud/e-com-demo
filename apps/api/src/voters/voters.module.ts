import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { VotersController } from './voters.controller';
import { VotersService } from './voters.service';

@Module({
  imports: [AuthModule],
  controllers: [VotersController],
  providers: [VotersService],
})
export class VotersModule {}
