import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { EnvVars } from '../../../config/validate-env';
import { setRequestContext } from '../../../shared/context/request-context';
import type { AccessTokenPayload } from '../token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService<EnvVars, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
    });
  }

  validate(payload: AccessTokenPayload): AccessTokenPayload {
    const scope = payload.scope ?? 'tenant';
    const user: AccessTokenPayload = {
      ...payload,
      scope,
      permissions: payload.permissions ?? [],
      roles: payload.roles ?? [],
    };
    if (scope === 'tenant' && user.tenantId) {
      setRequestContext({ tenantId: user.tenantId, userId: user.sub });
    } else if (scope === 'platform') {
      setRequestContext({ userId: user.sub });
    }
    return user;
  }
}
