import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LinkedEmployee } from './decorators/linked-employee.decorator';
import { EmployeeOnboardingDocumentsService } from '../employees/employee-onboarding-documents.service';
import { ListHolidaysQueryDto } from '../tenant/dto/list-holidays.query.dto';
import { EmployeePortalService } from './employee-portal.service';
import { EmployeeLinkGuard } from './guards/employee-link.guard';
import type { LinkedEmployeeContext } from './guards/employee-link.guard';

class PatchMeProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phoneAlt?: string;
}

class CreateLeaveDto {
  @IsUUID()
  leaveTypeId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

class AttendanceQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

class AttendanceMonthQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}

@ApiTags('employee-portal')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), EmployeeLinkGuard)
@Controller('me')
export class EmployeePortalController {
  constructor(
    private readonly portal: EmployeePortalService,
    private readonly onboardingDocs: EmployeeOnboardingDocumentsService,
  ) {}

  @Get('dashboard')
  dashboard(@LinkedEmployee() emp: LinkedEmployeeContext) {
    return this.portal.getDashboard(emp);
  }

  @Get('profile')
  profile(@LinkedEmployee() emp: LinkedEmployeeContext) {
    return this.portal.getProfile(emp);
  }

  @Patch('profile')
  patchProfile(
    @LinkedEmployee() emp: LinkedEmployeeContext,
    @Body() dto: PatchMeProfileDto,
  ) {
    return this.portal.patchProfile(emp, dto);
  }

  @Get('payslips')
  payslips(@LinkedEmployee() emp: LinkedEmployeeContext) {
    return this.portal.listPayslips(emp);
  }

  @Get('payslips/:runId/pdf')
  async payslipPdf(
    @LinkedEmployee() emp: LinkedEmployeeContext,
    @Param('runId', ParseUUIDPipe) runId: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.portal.getPayslipPdfBuffer(emp, runId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );
    res.send(buffer);
  }

  @Get('payslips/:runId')
  payslipDetail(
    @LinkedEmployee() emp: LinkedEmployeeContext,
    @Param('runId', ParseUUIDPipe) runId: string,
  ) {
    return this.portal.getPayslipDetail(emp, runId);
  }

  @Get('leave/types')
  leaveTypes(@LinkedEmployee() emp: LinkedEmployeeContext) {
    return this.portal.listLeaveTypes(emp.tenantId);
  }

  @Get('leave/balances')
  leaveBalances(@LinkedEmployee() emp: LinkedEmployeeContext) {
    return this.portal.listBalances(emp);
  }

  @Get('leave/requests')
  leaveRequests(@LinkedEmployee() emp: LinkedEmployeeContext) {
    return this.portal.listLeaveRequests(emp);
  }

  @Post('leave/requests')
  createLeave(
    @LinkedEmployee() emp: LinkedEmployeeContext,
    @Body() dto: CreateLeaveDto,
  ) {
    return this.portal.createLeaveRequest(emp, dto);
  }

  @Patch('leave/requests/:id/cancel')
  cancelLeave(
    @LinkedEmployee() emp: LinkedEmployeeContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.portal.cancelLeaveRequest(emp, id);
  }

  @Get('attendance/month')
  attendanceMonth(
    @LinkedEmployee() emp: LinkedEmployeeContext,
    @Query() query: AttendanceMonthQueryDto,
  ) {
    return this.portal.getAttendanceMonth(emp, query.year, query.month);
  }

  @Get('attendance')
  attendance(
    @LinkedEmployee() emp: LinkedEmployeeContext,
    @Query() query: AttendanceQueryDto,
  ) {
    return this.portal.listAttendance(emp, query);
  }

  @Get('holidays')
  holidays(
    @LinkedEmployee() emp: LinkedEmployeeContext,
    @Query() query: ListHolidaysQueryDto,
  ) {
    return this.portal.listHolidays(emp, query.year);
  }

  @Get('attendance/summary')
  attendanceSummary(
    @LinkedEmployee() emp: LinkedEmployeeContext,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const f =
      from ??
      new Date(new Date().setDate(new Date().getDate() - 30))
        .toISOString()
        .slice(0, 10);
    const t = to ?? new Date().toISOString().slice(0, 10);
    return this.portal.attendanceSummary(emp, f, t);
  }

  @Get('notifications')
  notifications(@LinkedEmployee() emp: LinkedEmployeeContext) {
    return this.portal.listNotifications(emp.userId, emp.tenantId);
  }

  @Get('onboarding-documents')
  listOnboardingDocuments(@LinkedEmployee() emp: LinkedEmployeeContext) {
    return this.onboardingDocs.listForEmployee(emp.tenantId, emp.id);
  }

  @Get('onboarding-documents/:documentId/download')
  async downloadOnboardingDocument(
    @LinkedEmployee() emp: LinkedEmployeeContext,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Res() res: Response,
  ) {
    const { row, fullPath } = await this.onboardingDocs.getFileMetaAndPath(
      emp.tenantId,
      emp.id,
      documentId,
    );
    res.setHeader('Content-Type', row.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(row.originalFilename)}"`,
    );
    res.sendFile(fullPath);
  }
}
