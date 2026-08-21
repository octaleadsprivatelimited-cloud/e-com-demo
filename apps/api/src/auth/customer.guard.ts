import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

/** Restricts self-service tenant routes to OTP-authenticated customers. */
@Injectable()
export class CustomerGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required.');
    }
    const decoded = this.authService.verifyToken(header.slice(7));
    if (!decoded) throw new UnauthorizedException('Invalid or expired session.');
    if (decoded.role !== 'customer') {
      throw new ForbiddenException('Customer access required.');
    }
    req.user = decoded;
    return true;
  }
}
