import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * AuditService — append-only security event log.
 * ──────────────────────────────────────────────
 * Records authentication and sensitive actions to apps/api/.data/audit.log
 * (one JSON object per line) so security events are traceable — a baseline
 * requirement for regulated / banking-grade systems. In production this should
 * ship to a tamper-evident, centralized log sink (SIEM).
 */
@Injectable()
export class AuditService {
  private readonly dir = path.join(process.cwd(), '.data');
  private readonly file = path.join(this.dir, 'audit.log');

  log(event: string, meta: Record<string, any> = {}): void {
    try {
      if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
      // Never log secrets/OTP values — only non-sensitive identifiers.
      const entry = {
        ts: new Date().toISOString(),
        event,
        ...meta,
      };
      fs.appendFileSync(this.file, JSON.stringify(entry) + '\n', 'utf8');
    } catch {
      // Auditing must never break the request path.
    }
  }

  /** Mask a mobile number for logs (e.g. 98765***10). */
  maskMobile(mobile?: string): string {
    if (!mobile || mobile.length < 6) return '***';
    return `${mobile.slice(0, 4)}***${mobile.slice(-2)}`;
  }
}
