import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AccessTokenPayload } from '../../auth/token.service';

@Injectable()
export class PlatformAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: AccessTokenPayload }>();
    const user = req.user;
    if (!user || user.scope !== 'platform') {
      throw new ForbiddenException('Platform administrator access required');
    }
    return true;
  }
}
