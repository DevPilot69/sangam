import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { EmployeeOnboardingDocumentsService } from '../employees/employee-onboarding-documents.service';
import { parseEmployeeOnboardingDocumentType } from '../employees/employee-onboarding-documents.utils';
import { CreateEmployeeDto } from '../employees/dto/create-employee.dto';
import { GetEmployeeQueryDto } from '../employees/dto/get-employee.query.dto';
import { ListEmployeesQueryDto } from '../employees/dto/list-employees.query.dto';
import { UpdateBankDetailsDto } from '../employees/dto/update-bank-details.dto';
import { UpdateEmployeeDto } from '../employees/dto/update-employee.dto';
import { EmployeesService } from '../employees/employees.service';
import { PlatformAuthGuard } from './guards/platform-auth.guard';

const empOnboardingMulter = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

@ApiTags('platform')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), PlatformAuthGuard)
@Controller('platform/tenants/:tenantId/employees')
export class PlatformEmployeesController {
  constructor(
    private readonly employees: EmployeesService,
    private readonly onboardingDocs: EmployeeOnboardingDocumentsService,
  ) {}

  @Get()
  list(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: ListEmployeesQueryDto,
  ) {
    return this.employees.list(tenantId, query);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post()
  create(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.employees.create(tenantId, dto);
  }

  @Get(':employeeId/onboarding-documents')
  listOnboardingDocuments(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    return this.onboardingDocs.listForEmployee(tenantId, employeeId);
  }

  @Throttle({ default: { limit: 40, ttl: 60000 } })
  @Post(':employeeId/onboarding-documents')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'documentType'],
      properties: {
        file: { type: 'string', format: 'binary' },
        documentType: { type: 'string' },
      },
    },
  })
  @UseInterceptors(empOnboardingMulter)
  uploadOnboardingDocument(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('documentType') documentTypeRaw: string | undefined,
  ) {
    return this.onboardingDocs.create(
      tenantId,
      employeeId,
      parseEmployeeOnboardingDocumentType(documentTypeRaw),
      file,
    );
  }

  @Get(':employeeId/onboarding-documents/:documentId/download')
  async downloadOnboardingDocument(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Res() res: Response,
  ) {
    const { row, fullPath } = await this.onboardingDocs.getFileMetaAndPath(
      tenantId,
      employeeId,
      documentId,
    );
    res.setHeader('Content-Type', row.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(row.originalFilename)}"`,
    );
    res.sendFile(fullPath);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Delete(':employeeId/onboarding-documents/:documentId')
  removeOnboardingDocument(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.onboardingDocs
      .remove(tenantId, employeeId, documentId)
      .then(() => ({ deleted: true }));
  }

  @Get(':employeeId')
  getOne(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query() query: GetEmployeeQueryDto,
  ) {
    const revealBank = query.reveal === 'bank';
    return this.employees.findOne(tenantId, employeeId, { revealBank });
  }

  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Patch(':employeeId/bank-details')
  patchBank(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: UpdateBankDetailsDto,
  ) {
    return this.employees.updateBankDetails(tenantId, employeeId, dto, null);
  }

  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Patch(':employeeId')
  update(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employees.update(tenantId, employeeId, dto, null);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Delete(':employeeId')
  remove(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    return this.employees.remove(tenantId, employeeId, null);
  }
}
