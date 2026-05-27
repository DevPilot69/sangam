import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PlatformAuthGuard } from './guards/platform-auth.guard';
import { TenantLegalDocumentsService } from '../tenant/tenant-legal-documents.service';
import { parseLegalDocumentType } from '../tenant/tenant-legal-documents.utils';

const legalDocMulter = FileInterceptor('file', {
  limits: { fileSize: 15 * 1024 * 1024 },
});

@ApiTags('platform')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), PlatformAuthGuard)
@Controller('platform/tenants/:tenantId/legal-documents')
export class PlatformTenantLegalDocumentsController {
  constructor(private readonly docs: TenantLegalDocumentsService) {}

  @Get()
  list(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.docs.list(tenantId);
  }

  @Post()
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
  @UseInterceptors(legalDocMulter)
  upload(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('documentType') documentTypeRaw: string | undefined,
  ) {
    return this.docs.create(
      tenantId,
      parseLegalDocumentType(documentTypeRaw),
      file,
    );
  }

  @Get(':documentId/download')
  async download(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Res() res: Response,
  ) {
    const { row, fullPath } = await this.docs.getFileMetaAndPath(
      tenantId,
      documentId,
    );
    res.setHeader('Content-Type', row.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(row.originalFilename)}"`,
    );
    res.sendFile(fullPath);
  }

  @Delete(':documentId')
  remove(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.docs.remove(tenantId, documentId).then(() => ({ deleted: true }));
  }
}
