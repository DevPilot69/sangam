import type { NextRequest } from "next/server";
import { prisma } from "@sangam/db";
import { ForbiddenError, requireAuth } from "@sangam/api-kit";

/**
 * Snapshot of the employee row linked to the currently-authenticated user.
 *
 * Ported from src/modules/employee-portal/guards/employee-link.guard.ts
 * (NestJS). The Nest version hung this off `req.linkedEmployee` via a
 * guard; in Next.js Route Handlers we resolve it lazily inside each handler
 * via `getLinkedEmployee(req)`. Returning a plain object keeps it framework-
 * neutral and easy to swap into server actions later.
 */
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

/**
 * Resolve the linked employee for the calling user. Used by every
 * `/v1/me/*` route to guarantee the user actually owns an employee row in
 * their tenant.
 *
 * Throws `ForbiddenError` (403) when:
 *  - the session is not a tenant session (e.g. platform-admin token), or
 *  - no employee row matches `userId`+`tenantId` (account exists but no HR
 *    profile linked — admin needs to map them).
 */
export async function getLinkedEmployee(
  req: NextRequest,
): Promise<LinkedEmployeeContext> {
  const user = await requireAuth(req);
  if (user.scope !== "tenant" || !user.tenantId) {
    throw new ForbiddenError("Tenant session required");
  }

  const employee = await prisma.employee.findFirst({
    where: {
      userId: user.sub,
      tenantId: user.tenantId,
      deletedAt: null,
    },
  });
  if (!employee) {
    throw new ForbiddenError(
      "No employee profile linked to this account. Contact your HR administrator.",
    );
  }

  return {
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
}
