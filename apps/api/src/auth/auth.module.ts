import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { SupportGuard } from './support.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        // Fail fast: never fall back to a hardcoded/public secret, which would
        // allow anyone to forge valid session tokens.
        if (!secret || secret.length < 16) {
          throw new Error(
            'JWT_SECRET is missing or too weak. Set a strong, unique value in .env.',
          );
        }
        return {
          secret,
          signOptions: { expiresIn: '2h' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, AdminGuard, SupportGuard],
  exports: [AuthService, JwtAuthGuard, AdminGuard, SupportGuard],
})
export class AuthModule {}
