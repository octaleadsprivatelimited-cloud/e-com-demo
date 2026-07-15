import { Controller, Post, Body, Headers, HttpCode, HttpStatus, BadRequestException, Req, ForbiddenException } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    // If rawBody is not enabled/available in Nest, stringify body
    const rawPayload = JSON.stringify(body);
    const isValid = this.paymentService.verifyWebhookSignature(rawPayload, signature);

    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = body.event;
    if (event === 'payment.captured') {
      const paymentEntity = body.payload?.payment?.entity;
      if (!paymentEntity) {
        throw new BadRequestException('Payment entity missing');
      }
      const result = this.paymentService.processPaymentCaptured(paymentEntity);
      console.log('[Webhook Successful] Payment processed:', result);
      return { status: 'success', processed: true, data: result };
    }

    return { status: 'ignored_event', event };
  }

  /**
   * DEV-ONLY: Helper endpoint for the frontend to sign a payload and simulate webhook events.
   * This endpoint is disabled in production to prevent payment forgery.
   */
  @Post('simulate-webhook-signature')
  simulateSignature(@Body() body: any) {
    // Block this endpoint in production — it would let anyone forge webhook signatures
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        'Webhook simulation is disabled in production. Use the actual Razorpay payment gateway.',
      );
    }

    const rawPayload = JSON.stringify(body);
    const signature = this.paymentService.computeSignature(rawPayload);
    return { signature };
  }
}
