import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/token.service';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { BulkImportEmployeesDto } from './dto/bulk-import-employees.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { GetEmployeeQueryDto } from './dto/get-employee.query.dto';
import { ListEmployeesQueryDto } from './dto/list-employees.query.dto';
import { UpdateBankDetailsDto } from './dto/update-bank-details.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeOnboardingDocumentsService } from './employee-onboarding-documents.service';
import { parseEmployeeOnboardingDocumentType } from './employee-onboarding-documents.utils';
import { EmployeesService } from './employees.service';

const empOnboardingMulter = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

@ApiTags('employees')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('employees')
export class EmployeesController {
  constructor(
    private readonly employees: EmployeesService,
    private readonly onboardingDocs: EmployeeOnboardingDocumentsService,
  ) {}

  @RequirePermission('employees:read')
  @Get()
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: ListEmployeesQueryDto,
  ) {
    return this.employees.list(user.tenantId, query);
  }

  @RequirePermission('employees:read')
  @Get('export')
  exportEmployees(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: ListEmployeesQueryDto,
  ) {
    const includeSensitive = (user.permissions ?? []).includes(
      'employees:write',
    );
    return this.employees.exportAll(user.tenantId, includeSensitive, query);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @RequirePermission('employees:write')
  @Post('bulk')
  bulkImport(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: BulkImportEmployeesDto,
  ) {
    return this.employees.bulkImport(user.tenantId, dto.rows);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @RequirePermission('employees:write')
  @Post()
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.employees.create(user.tenantId, dto);
  }

  @RequirePermission('employees:read')
  @Get(':id/onboarding-documents')
  listOnboardingDocuments(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.onboardingDocs.listForEmployee(user.tenantId, id);
  }

  @Throttle({ default: { limit: 40, ttl: 60000 } })
  @RequirePermission('employees:write')
  @Post(':id/onboarding-documents')
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
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('documentType') documentTypeRaw: string | undefined,
  ) {
    return this.onboardingDocs.create(
      user.tenantId,
      id,
      parseEmployeeOnboardingDocumentType(documentTypeRaw),
      file,
    );
  }

  @RequirePermission('employees:read')
  @Get(':id/onboarding-documents/:documentId/download')
  async downloadOnboardingDocument(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Res() res: Response,
  ) {
    const { row, fullPath } = await this.onboardingDocs.getFileMetaAndPath(
      user.tenantId,
      id,
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
  @RequirePermission('employees:write')
  @Delete(':id/onboarding-documents/:documentId')
  removeOnboardingDocument(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.onboardingDocs
      .remove(user.tenantId, id, documentId)
      .then(() => ({ deleted: true }));
  }

  @RequirePermission('employees:read')
  @Get(':id')
  getOne(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetEmployeeQueryDto,
  ) {
    const revealBank =
      query.reveal === 'bank' &&
      (user.permissions ?? []).includes('employees:write');
    if (query.reveal === 'bank' && !revealBank) {
      throw new ForbiddenException(
        'employees:write required to reveal bank details',
      );
    }
    return this.employees.findOne(user.tenantId, id, { revealBank });
  }

  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @RequirePermission('employees:write')
  @Patch(':id/bank-details')
  patchBank(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBankDetailsDto,
  ) {
    return this.employees.updateBankDetails(user.tenantId, id, dto, user.sub);
  }

  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @RequirePermission('employees:write')
  @Patch(':id')
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employees.update(user.tenantId, id, dto, user.sub);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @RequirePermission('employees:write')
  @Delete(':id')
  remove(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.employees.remove(user.tenantId, id, user.sub);
  }
}
