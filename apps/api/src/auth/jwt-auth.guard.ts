import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * JwtAuthGuard — verifies the Bearer session token on protected routes and
 * attaches the decoded user to request.user.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
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

    req.user = decoded;
    return true;
  }
}
