import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DepartmentsService } from './org/departments.service';
import { DesignationsService } from './org/designations.service';
import { HolidaysService } from './org/holidays.service';
import { TenantController } from './tenant.controller';
import { TenantDepartmentsController } from './tenant-departments.controller';
import { TenantDesignationsController } from './tenant-designations.controller';
import { TenantHolidaysController } from './tenant-holidays.controller';
import { TenantPasswordManagerController } from './tenant-password-manager.controller';
import { TenantLegalDocumentsController } from './tenant-legal-documents.controller';
import { TenantLegalDocumentsService } from './tenant-legal-documents.service';
import { TenantService } from './tenant.service';

@Module({
  imports: [AuthModule],
  controllers: [
    TenantController,
    TenantDepartmentsController,
    TenantDesignationsController,
    TenantHolidaysController,
    TenantPasswordManagerController,
    TenantLegalDocumentsController,
  ],
  providers: [
    TenantService,
    TenantLegalDocumentsService,
    DepartmentsService,
    DesignationsService,
    HolidaysService,
  ],
  exports: [
    DepartmentsService,
    DesignationsService,
    HolidaysService,
    TenantLegalDocumentsService,
  ],
})
export class TenantModule {}
