import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmployeesController } from './employees.controller';
import { EmployeeOnboardingDocumentsService } from './employee-onboarding-documents.service';
import { EmployeesService } from './employees.service';

@Module({
  imports: [AuthModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeeOnboardingDocumentsService],
  exports: [EmployeesService, EmployeeOnboardingDocumentsService],
})
export class EmployeesModule {}
