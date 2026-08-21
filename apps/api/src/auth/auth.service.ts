import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

interface OtpRecord {
  otp: string;
  mobile: string;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
}

interface RateLimitRecord {
  count: number;
  windowStart: number;
}

@Injectable()
export class AuthService {
  // In-memory OTP store — in production, use Redis or database
  private otpStore = new Map<string, OtpRecord>();

  // Rate limiting store — in production, use Redis
  private rateLimitStore = new Map<string, RateLimitRecord>();

  // Credential encryption key — derived from env secret
  private readonly encryptionKey: Buffer;

  constructor(private readonly jwtService: JwtService) {
    const secret = process.env.CREDENTIALS_ENCRYPTION_KEY;
    // Fail fast: no public fallback key. A known key means stored credentials
    // (SMS/WhatsApp/IVR tokens) can be decrypted by anyone with the source.
    if (!secret || secret.length < 16) {
      throw new Error(
        'CREDENTIALS_ENCRYPTION_KEY is missing or too weak. Set a strong, unique value in .env.',
      );
    }
    // Derive a 32-byte key using SHA-256
    this.encryptionKey = crypto.createHash('sha256').update(secret).digest();
  }

  // ─── OTP Generation & Verification ──────────────────────────────

  /**
   * Generate a cryptographically secure 6-digit OTP for a mobile number.
   * Rate limited: max 3 OTP requests per mobile per 5 minutes.
   */
  generateOtp(mobile: string): { success: boolean; message: string; otp?: string } {
    // Rate limit check: max 3 OTP sends per 5-minute window
    const rateLimitKey = `otp_send_${mobile}`;
    const now = Date.now();
    const windowMs = 5 * 60 * 1000; // 5 minutes
    const maxSends = 3;

    const rateRecord = this.rateLimitStore.get(rateLimitKey);
    if (rateRecord) {
      if (now - rateRecord.windowStart < windowMs) {
        if (rateRecord.count >= maxSends) {
          return {
            success: false,
            message: `Too many OTP requests. Please wait ${Math.ceil((windowMs - (now - rateRecord.windowStart)) / 1000)} seconds before trying again.`,
          };
        }
        rateRecord.count++;
      } else {
        // Reset window
        rateRecord.count = 1;
        rateRecord.windowStart = now;
      }
    } else {
      this.rateLimitStore.set(rateLimitKey, { count: 1, windowStart: now });
    }

    // Preserve an outstanding challenge so an unauthenticated resend cannot
    // invalidate the code already delivered to the customer.
    const active = this.otpStore.get(mobile);
    if (active && active.expiresAt > now && active.attempts < active.maxAttempts) {
      const exposeTestOtp =
        process.env.NODE_ENV === 'test' && process.env.EXPOSE_TEST_OTP === 'true';
      return {
        success: true,
        message: exposeTestOtp
          ? 'Existing test OTP remains active'
          : 'OTP sent to your registered mobile number',
        ...(exposeTestOtp ? { otp: active.otp } : {}),
      };
    }

    // Generate cryptographically secure 6-digit OTP
    const otpBytes = crypto.randomBytes(3);
    const otpNum = (otpBytes.readUIntBE(0, 3) % 900000) + 100000;
    const otp = otpNum.toString();

    // Store with 5-minute expiry and max 3 verification attempts
    this.otpStore.set(mobile, {
      otp,
      mobile,
      expiresAt: now + 5 * 60 * 1000,
      attempts: 0,
      maxAttempts: 3,
    });

    // In production, send via SMS gateway here (Twilio, Msg91, etc.)
    // For now, return OTP only in development mode
    const exposeTestOtp =
      process.env.NODE_ENV === 'test' && process.env.EXPOSE_TEST_OTP === 'true';

    return {
      success: true,
      message: exposeTestOtp ? 'Test OTP generated' : 'OTP sent to your registered mobile number',
      ...(exposeTestOtp ? { otp } : {}),
    };
  }

  /**
   * Verify an OTP for a mobile number.
   * Rate limited: max 3 attempts per OTP.
   */
  verifyOtp(mobile: string, enteredOtp: string): { valid: boolean; message: string } {
    const record = this.otpStore.get(mobile);

    if (!record) {
      return { valid: false, message: 'No OTP found. Please request a new one.' };
    }

    // Check expiry
    if (Date.now() > record.expiresAt) {
      this.otpStore.delete(mobile);
      return { valid: false, message: 'OTP has expired. Please request a new one.' };
    }

    // Check attempt count
    if (record.attempts >= record.maxAttempts) {
      this.otpStore.delete(mobile);
      return { valid: false, message: 'Too many failed attempts. Please request a new OTP.' };
    }

    record.attempts++;

    // Constant-time comparison for OTP
    const otpBuffer = Buffer.from(record.otp);
    const enteredBuffer = Buffer.from(enteredOtp);

    if (otpBuffer.length !== enteredBuffer.length) {
      return { valid: false, message: 'Invalid OTP. Please check and try again.' };
    }

    const isValid = crypto.timingSafeEqual(otpBuffer, enteredBuffer);

    if (!isValid) {
      const remaining = record.maxAttempts - record.attempts;
      return {
        valid: false,
        message: `Invalid OTP. ${remaining} attempt(s) remaining.`,
      };
    }

    // OTP is valid — clean up
    this.otpStore.delete(mobile);
    return { valid: true, message: 'OTP verified successfully.' };
  }

  // ─── JWT Session Management ─────────────────────────────────────

  /**
   * Issue a JWT session token for a verified user.
   */
  issueToken(payload: { mobile: string; id: string; role: 'customer' | 'admin' | 'support'; name?: string }): string {
    // Customers re-authenticate by OTP after four hours. Privileged admin and
    // support sessions retain the shorter two-hour server-side ceiling.
    const expiresIn = payload.role === 'customer' ? '4h' : '2h';
    return this.jwtService.sign(payload, { expiresIn });
  }

  /**
   * Verify and decode a JWT session token.
   */
  verifyToken(token: string): any {
    try {
      return this.jwtService.verify(token);
    } catch {
      return null;
    }
  }

  // ─── Credential Encryption ──────────────────────────────────────

  /**
   * Encrypt sensitive API credentials (Twilio keys, Meta tokens, etc.)
   * using AES-256-GCM before storage.
   */
  encryptCredential(plaintext: string): string {
    if (!plaintext) return '';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    // Format: iv:authTag:ciphertext
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypt API credentials encrypted with encryptCredential().
   */
  decryptCredential(encryptedStr: string): string {
    if (!encryptedStr) return '';
    try {
      const parts = encryptedStr.split(':');
      if (parts.length !== 3) return '';
      const [ivHex, authTagHex, ciphertext] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return '';
    }
  }

  // ─── Cleanup (periodic) ─────────────────────────────────────────

  /**
   * Prune expired OTPs and rate limit records.
   * Call this periodically via a cron job or interval.
   */
  cleanup(): void {
    const now = Date.now();

    for (const [key, record] of this.otpStore) {
      if (now > record.expiresAt) {
        this.otpStore.delete(key);
      }
    }

    for (const [key, record] of this.rateLimitStore) {
      if (now - record.windowStart > 10 * 60 * 1000) {
        this.rateLimitStore.delete(key);
      }
    }
  }
}
