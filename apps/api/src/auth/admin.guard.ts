import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * AdminGuard — like JwtAuthGuard, but additionally requires role === 'admin'.
 * Used to protect the platform-admin resources (voters, DLT templates).
 */
@Injectable()
export class AdminGuard implements CanActivate {
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
    if (decoded.role !== 'admin') {
      throw new ForbiddenException('Admin access required.');
    }
    req.user = decoded;
    return true;
  }
}
