import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AccessTokenPayload } from '../../modules/auth/token.service';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const req = context
      .switchToHttp()
      .getRequest<{ user?: AccessTokenPayload }>();
    const user = req.user;
    if (!user) throw new ForbiddenException('Not authenticated');

    const granted = new Set(user.permissions ?? []);
    for (const code of required) {
      if (!granted.has(code)) {
        throw new ForbiddenException(`Missing permission: ${code}`);
      }
    }
    return true;
  }
}
