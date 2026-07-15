import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  private readonly webhookSecret: string;

  constructor() {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    // Fail fast: no public fallback. A known webhook secret lets anyone forge
    // "payment.captured" events and grant themselves unlimited credits.
    if (!secret || secret.length < 16) {
      throw new Error(
        'RAZORPAY_WEBHOOK_SECRET is missing or too weak. Set a strong, unique value in .env.',
      );
    }
    this.webhookSecret = secret;
  }

  /** Compute the HMAC-SHA256 signature for a raw payload (used by dev tooling). */
  computeSignature(payload: string): string {
    return crypto.createHmac('sha256', this.webhookSecret).update(payload).digest('hex');
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!signature) {
      return false;
    }
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    hmac.update(payload);
    const digest = hmac.digest('hex');

    // Use constant-time comparison to prevent timing side-channel attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(digest, 'hex'),
        Buffer.from(signature, 'hex'),
      );
    } catch {
      // If signature is not valid hex or lengths differ, reject
      return false;
    }
  }

  processPaymentCaptured(paymentEntity: any) {
    const { id, amount, currency, status, notes } = paymentEntity;
    const mobile = notes?.mobile;
    const smsCredits = parseInt(notes?.sms || '0', 10);
    const waCredits = parseInt(notes?.wa || '0', 10);
    const ivrCredits = parseInt(notes?.ivr || '0', 10);

    return {
      paymentId: id,
      status: 'CAPTURED',
      amount: amount / 100, // Razorpay uses paisa
      currency,
      customerMobile: mobile,
      creditsAllocated: {
        sms: smsCredits,
        whatsapp: waCredits,
        ivr: ivrCredits,
      },
    };
  }
}
