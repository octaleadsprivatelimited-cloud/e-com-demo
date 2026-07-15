import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * SupportGuard — allows the support desk (role 'support') and admins.
 * Support has read-only, PII-masked access + ticket management; it can NEVER
 * mutate customer accounts or export data (enforced by which endpoints exist).
 */
@Injectable()
export class SupportGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required.');
    }
    const decoded = this.authService.verifyToken(header.slice(7));
    if (!decoded) {
      throw new UnauthorizedException('Invalid or expired session.');
    }
    if (decoded.role !== 'support' && decoded.role !== 'admin') {
      throw new ForbiddenException('Support access required.');
    }
    req.user = decoded;
    return true;
  }
}
