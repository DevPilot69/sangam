import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { EmployeesModule } from '../employees/employees.module';
import { TenantModule } from '../tenant/tenant.module';
import { PlatformAuthController } from './platform-auth.controller';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformAuthGuard } from './guards/platform-auth.guard';
import { PlatformBillingController } from './platform-billing.controller';
import { PlatformBillingService } from './platform-billing.service';
import { PlatformTelemetryController } from './platform-telemetry.controller';
import { PlatformTelemetryService } from './platform-telemetry.service';
import { PlatformTenantPaymentDocumentsController } from './platform-tenant-payment-documents.controller';
import { PlatformTenantsController } from './platform-tenants.controller';
import { PlatformTenantsService } from './platform-tenants.service';
import { PlatformEmployeesController } from './platform-employees.controller';
import { PlatformTenantOrgController } from './platform-tenant-org.controller';
import { PlatformPasswordManagerController } from './platform-password-manager.controller';
import { PlatformTenantLegalDocumentsController } from './platform-tenant-legal-documents.controller';
import { PlatformHolidaysController } from './platform-holidays.controller';
import { PlatformTenantHolidaysController } from './platform-tenant-holidays.controller';

@Module({
  imports: [AuthModule, BillingModule, EmployeesModule, TenantModule],
  controllers: [
    PlatformAuthController,
    PlatformTelemetryController,
    PlatformBillingController,
    PlatformTenantsController,
    PlatformEmployeesController,
    PlatformTenantOrgController,
    PlatformPasswordManagerController,
    PlatformTenantLegalDocumentsController,
    PlatformTenantPaymentDocumentsController,
    PlatformHolidaysController,
    PlatformTenantHolidaysController,
  ],
  providers: [
    PlatformAuthService,
    PlatformTelemetryService,
    PlatformBillingService,
    PlatformTenantsService,
    PlatformAuthGuard,
  ],
  exports: [PlatformAuthService],
})
export class PlatformModule {}
