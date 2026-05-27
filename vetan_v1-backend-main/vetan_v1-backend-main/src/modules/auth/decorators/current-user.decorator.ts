import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AccessTokenPayload } from '../token.service';

export const CurrentUser = createParamDecorator(
  (
    data: keyof AccessTokenPayload | undefined,
    ctx: ExecutionContext,
  ): AccessTokenPayload | string | string[] | undefined => {
    const req = ctx.switchToHttp().getRequest<{ user?: AccessTokenPayload }>();
    const user = req.user;
    if (!user) return undefined;
    if (data) return user[data];
    return user;
  },
);
