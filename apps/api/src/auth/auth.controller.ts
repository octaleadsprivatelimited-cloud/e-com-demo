import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { AuditService } from '../common/audit.service';
import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

// ─── DTOs ─────────────────────────────────────────────────────────
// NOTE: properties MUST carry class-validator decorators — the global
// ValidationPipe runs with { whitelist, forbidNonWhitelisted }, so any
// undecorated property is rejected as "should not exist".

class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  mobile: string;
}

class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  mobile: string;

  @IsString()
  @IsNotEmpty()
  otp: string;

  // Legacy clients may still send this field. It is intentionally ignored:
  // tenant identity is derived only from the OTP-verified mobile number.
  @IsOptional() @IsString() candidateId?: string;
}

class EncryptCredentialDto {
  @IsString()
  value: string;
}

class DecryptCredentialDto {
  @IsString()
  encrypted: string;
}

class SaveCredentialsDto {
  @IsOptional() @IsString() smsApiKey?: string;
  @IsOptional() @IsString() smsSenderId?: string;
  @IsOptional() @IsString() waToken?: string;
  @IsOptional() @IsString() waPhoneId?: string;
  @IsOptional() @IsString() ivrAuth?: string;
  @IsOptional() @IsString() ivrSid?: string;
  @IsOptional() @IsString() ivrCallerId?: string;
  @IsOptional() @IsString() smsProvider?: string;
  @IsOptional() @IsString() waProvider?: string;
  @IsOptional() @IsString() ivrProvider?: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly audit: AuditService,
  ) {}

  // ─── OTP Endpoints ────────────────────────────────────────────

  /**
   * POST /auth/send-otp
   * Generate and send OTP to a mobile number.
   * Rate limited: max 5 requests / minute per IP (on top of the per-mobile
   * limit in AuthService) to blunt SMS-bombing and enumeration.
   */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  sendOtp(@Body() dto: SendOtpDto, @Req() req: any) {
    if (!dto.mobile || dto.mobile.length !== 10 || isNaN(Number(dto.mobile))) {
      throw new BadRequestException('A valid 10-digit mobile number is required.');
    }

    const result = this.authService.generateOtp(dto.mobile);
    this.audit.log('otp.request', {
      mobile: this.audit.maskMobile(dto.mobile),
      ip: req?.ip,
      ok: result.success,
    });

    if (!result.success) {
      throw new BadRequestException(result.message);
    }

    return result;
  }

  /**
   * POST /auth/verify-otp
   * Verify OTP and issue a JWT session token.
   * Rate limited: max 10 attempts / minute per IP (brute-force protection).
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: any) {
    if (!dto.mobile || !dto.otp) {
      throw new BadRequestException('Mobile number and OTP are required.');
    }

    const result = this.authService.verifyOtp(dto.mobile, dto.otp);

    if (!result.valid) {
      this.audit.log('auth.login.failure', {
        mobile: this.audit.maskMobile(dto.mobile),
        ip: req?.ip,
      });
      throw new BadRequestException(result.message);
    }

    // Issue JWT session token
    const token = this.authService.issueToken({
      mobile: dto.mobile,
      id: `CUS-${crypto.createHash('sha256').update(dto.mobile).digest('hex').slice(0, 20)}`,
      role: 'customer',
    });
    this.audit.log('auth.login.success', {
      mobile: this.audit.maskMobile(dto.mobile),
      ip: req?.ip,
    });

    return {
      success: true,
      message: 'Authentication successful.',
      token,
    };
  }

  /**
   * POST /auth/admin-login
   * Verify the admin console PIN (server-side) and issue an admin JWT so the
   * admin panel can call the same protected API. Rate limited to blunt brute force.
   */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('admin-login')
  @HttpCode(HttpStatus.OK)
  adminLogin(@Body() body: { pin?: string }, @Req() req: any) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Legacy shared-PIN administration is disabled.');
    }
    const adminPin = process.env.ADMIN_PIN;
    if (!adminPin) {
      throw new BadRequestException('Admin access is not configured.');
    }
    const pin = typeof body?.pin === 'string' ? body.pin : '';
    const a = Buffer.from(pin);
    const b = Buffer.from(adminPin);
    const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!valid) {
      this.audit.log('admin.login.failure', { ip: req?.ip });
      throw new UnauthorizedException('Invalid admin PIN.');
    }

    const token = this.authService.issueToken({
      mobile: 'admin',
      id: 'admin',
      role: 'admin',
    });
    this.audit.log('admin.login.success', { ip: req?.ip });
    return { success: true, token };
  }

  /**
   * GET /auth/verify-session
   * Validate an existing JWT session token.
   */
  @Get('verify-session')
  verifySession(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No session token provided.');
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = this.authService.verifyToken(token);

    if (!decoded) {
      throw new UnauthorizedException('Invalid or expired session token.');
    }

    return {
      valid: true,
      user: {
        mobile: decoded.mobile,
        id: decoded.id,
        role: decoded.role,
      },
    };
  }

  // ─── Credential Encryption Endpoints ──────────────────────────

  /**
   * POST /auth/encrypt-credentials
   * Encrypt sensitive API credentials server-side before storage.
   * Requires a valid session token.
   */
  @Post('encrypt-credentials')
  @HttpCode(HttpStatus.OK)
  encryptCredentials(
    @Headers('authorization') authHeader: string,
    @Body() dto: SaveCredentialsDto,
  ) {
    this.requireAuth(authHeader);

    // Encrypt each sensitive field
    const encrypted: Record<string, string> = {};
    const sensitiveFields = ['smsApiKey', 'waToken', 'ivrAuth', 'ivrSid'];
    const plainFields = ['smsSenderId', 'waPhoneId', 'ivrCallerId', 'smsProvider', 'waProvider', 'ivrProvider'];

    for (const field of sensitiveFields) {
      const value = (dto as any)[field];
      if (value) {
        encrypted[field] = this.authService.encryptCredential(value);
      }
    }

    // Non-sensitive fields pass through
    for (const field of plainFields) {
      const value = (dto as any)[field];
      if (value) {
        encrypted[field] = value;
      }
    }

    return {
      success: true,
      encrypted,
    };
  }

  /**
   * POST /auth/decrypt-credential
   * Decrypt a single credential value. Requires a valid session token.
   */
  @Post('decrypt-credential')
  @HttpCode(HttpStatus.OK)
  decryptCredential(
    @Headers('authorization') authHeader: string,
    @Body() dto: DecryptCredentialDto,
  ) {
    this.requireAuth(authHeader);
    void dto;
    throw new ForbiddenException('Credential plaintext is never returned through the API.');
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private requireAuth(authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required.');
    }
    const token = authHeader.replace('Bearer ', '');
    const decoded = this.authService.verifyToken(token);
    if (!decoded) {
      throw new UnauthorizedException('Invalid or expired session.');
    }
    return decoded;
  }
}
