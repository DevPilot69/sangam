import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'vetan:permissions';

/** User must have every listed permission (AND). */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permissions);
