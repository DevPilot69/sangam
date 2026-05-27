import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { AccessTokenPayload } from '../../auth/token.service';

export type LinkedEmployeeContext = {
  id: string;
  tenantId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string | null;
  designationId: string | null;
  status: string;
  dateOfJoining: Date;
  pan: string | null;
  bankAccount: string | null;
  ifsc: string | null;
  userId: string;
};

@Injectable()
export class EmployeeLinkGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      user?: AccessTokenPayload;
      linkedEmployee?: LinkedEmployeeContext;
    }>();
    const user = req.user;
    if (!user || user.scope !== 'tenant' || !user.tenantId) {
      throw new ForbiddenException('Tenant session required');
    }

    const employee = await this.prisma.employee.findFirst({
      where: {
        userId: user.sub,
        tenantId: user.tenantId,
        deletedAt: null,
      },
    });
    if (!employee) {
      throw new ForbiddenException(
        'No employee profile linked to this account. Contact your HR administrator.',
      );
    }

    req.linkedEmployee = {
      id: employee.id,
      tenantId: employee.tenantId,
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      departmentId: employee.departmentId,
      designationId: employee.designationId,
      status: employee.status,
      dateOfJoining: employee.dateOfJoining,
      pan: employee.pan,
      bankAccount: employee.bankAccount,
      ifsc: employee.ifsc,
      userId: user.sub,
    };
    return true;
  }
}
