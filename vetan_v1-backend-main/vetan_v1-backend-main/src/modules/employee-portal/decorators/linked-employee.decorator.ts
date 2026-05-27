import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { LinkedEmployeeContext } from '../guards/employee-link.guard';

export const LinkedEmployee = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): LinkedEmployeeContext => {
    const req = ctx.switchToHttp().getRequest<{ linkedEmployee: LinkedEmployeeContext }>();
    return req.linkedEmployee;
  },
);
