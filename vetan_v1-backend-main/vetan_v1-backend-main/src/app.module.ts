import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/validate-env';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuditModule } from './modules/audit/audit.module';
import { EmployeePortalModule } from './modules/employee-portal/employee-portal.module';
import { PlatformModule } from './modules/platform/platform.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { HealthModule } from './modules/health/health.module';
import { LeaveModule } from './modules/leave/leave.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { DemoSimulationInterceptor } from './shared/interceptors/demo-simulation.interceptor';
import { AuthzModule } from './shared/authz/authz.module';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { RequestIdInterceptor } from './shared/interceptors/request-id.interceptor';
import { TransformResponseInterceptor } from './shared/interceptors/transform-response.interceptor';
import { AppLoggerModule } from './shared/logger/app-logger.module';
@Module({
  imports: [
    AppLoggerModule,
    AuthzModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    TenantModule,
    BillingModule,
    EmployeesModule,
    DashboardModule,
    PayrollModule,
    ReportsModule,
    LeaveModule,
    AttendanceModule,
    NotificationsModule,
    AuditModule,
    EmployeePortalModule,
    PlatformModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: DemoSimulationInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
