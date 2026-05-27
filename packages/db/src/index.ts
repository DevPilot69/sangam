import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client singleton.
 *
 * Pattern explained:
 *  - In Next.js dev mode (HMR), modules are reloaded on every change. Without
 *    this guard each reload would instantiate a new PrismaClient, leak the
 *    previous connection, and quickly exhaust Neon's pool.
 *  - On Vercel each Lambda invocation may share the singleton across requests
 *    *within the same container*, but cold starts always create a fresh one.
 *    Pair this with a *pooled* DATABASE_URL (Neon's PgBouncer endpoint) and
 *    `connection_limit=1` so each Lambda holds at most one upstream socket.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Re-export from the generated client. We name each export explicitly rather
 * than using `export *` because @prisma/client is a CJS module and `export *`
 * triggers Turbopack's "unexpected export *" runtime helper, which has caused
 * module-init TDZ errors ("Cannot access 'm' before initialization") during
 * Vercel's page-data collection step. Naming the exports avoids that codepath.
 *
 * Runtime values (enums + the `Prisma` namespace + the `PrismaClient` class)
 * need to be re-exported as values. Pure model types are re-exported with
 * `export type` so they're erased at runtime.
 */

// Runtime values: the Prisma namespace, the client class, and every enum.
export {
  Prisma,
  PrismaClient,
  UserStatus,
  EmploymentStatus,
  SalaryComponentType,
  PayrollRunStatus,
  SalaryPaymentMethod,
  LeaveRequestStatus,
  SubscriptionStatus,
  TenantPaymentStatus,
  TenantLegalDocumentType,
  EmployeeOnboardingDocumentType,
} from "@prisma/client";

// Model types only (erased at runtime).
export type {
  PlatformAdmin,
  PlatformHoliday,
  Tenant,
  TenantLegalDocument,
  User,
  Permission,
  Role,
  RolePermission,
  UserRole,
  RefreshToken,
  PasswordResetToken,
  EmailVerificationOtp,
  Department,
  Designation,
  TenantHoliday,
  Employee,
  EmployeeOnboardingDocument,
  SalaryComponent,
  SalaryStructure,
  SalaryStructureComponent,
  SalaryAssignment,
  SalaryRevision,
  AttendanceRecord,
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  PayrollRun,
  PayrollEntry,
  Payslip,
  AuditLog,
  Notification,
  NotificationPreference,
  Subscription,
  Invoice,
  TenantBillingOps,
  MockEmail,
  MockUpload,
} from "@prisma/client";
