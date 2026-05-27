import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module';
import { TenantModule } from '../tenant/tenant.module';
import { EmployeePortalController } from './employee-portal.controller';
import { EmployeePortalService } from './employee-portal.service';
import { EmployeeLinkGuard } from './guards/employee-link.guard';

@Module({
  imports: [EmployeesModule, TenantModule],
  controllers: [EmployeePortalController],
  providers: [EmployeePortalService, EmployeeLinkGuard],
})
export class EmployeePortalModule {}
