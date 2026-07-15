import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuditService } from './audit.service';

/**
 * AllExceptionsFilter — the API's safety net.
 * ───────────────────────────────────────────
 * AUTO-DETECT: catches every unhandled error in every request so a single
 * failing request can never crash the process or leak a stack trace.
 * It normalizes the response, logs 5xx errors server-side (with the path) to
 * the audit log for alerting, and returns a clean, generic message to clients.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  constructor(private readonly audit?: AuditService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttp ? exception.getResponse() : null;
    const rawMessage =
      typeof body === 'string'
        ? body
        : ((body as any)?.message ?? (exception as any)?.message ?? 'Error');

    // Server errors: log full detail server-side, never expose it to the client.
    if (status >= 500) {
      this.logger.error(
        `${req?.method} ${req?.url} -> ${status}: ${rawMessage}`,
        (exception as any)?.stack,
      );
      try {
        this.audit?.log('error.unhandled', {
          method: req?.method,
          path: req?.url,
          status,
          message: String(rawMessage).slice(0, 300),
        });
      } catch {
        /* auditing must never throw */
      }
    }

    if (res.headersSent) return;

    res.status(status).json({
      success: false,
      statusCode: status,
      // Generic message for server faults; the real (safe) message for 4xx.
      message:
        status >= 500
          ? 'An unexpected error occurred. Please try again in a moment.'
          : rawMessage,
      path: req?.url,
      timestamp: new Date().toISOString(),
    });
  }
}
