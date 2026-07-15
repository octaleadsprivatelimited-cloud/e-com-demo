import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PaymentModule } from './payment/payment.module';
import { AuthModule } from './auth/auth.module';
import { StoreModule } from './common/store.module';
import { EntityModule } from './common/entity.module';
import { AuditModule } from './common/audit.module';
import { CandidatesModule } from './candidates/candidates.module';
import { ContactsModule } from './contacts/contacts.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { BillingModule } from './billing/billing.module';
import { VotersModule } from './voters/voters.module';
import { TemplatesModule } from './templates/templates.module';
import { SupportModule } from './support/support.module';

@Module({
  imports: [
    // Load environment variables from the repo-root .env (and a local one if
    // present) BEFORE any other module initializes. Without this, secrets fell
    // back to public hardcoded defaults — allowing JWT and webhook forgery.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    // Global rate limiting (brute-force / DoS protection). Per-route overrides
    // via @Throttle() — auth endpoints are locked down much tighter.
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 120 },
    ]),
    StoreModule,
    EntityModule,
    AuditModule,
    PaymentModule,
    AuthModule,
    CandidatesModule,
    ContactsModule,
    CampaignsModule,
    BillingModule,
    VotersModule,
    TemplatesModule,
    SupportModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
