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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/token.service';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { TenantLegalDocumentsService } from './tenant-legal-documents.service';
import { parseLegalDocumentType } from './tenant-legal-documents.utils';

const legalDocMulter = FileInterceptor('file', {
  limits: { fileSize: 15 * 1024 * 1024 },
});

@ApiTags('tenant')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('tenant/legal-documents')
export class TenantLegalDocumentsController {
  constructor(private readonly docs: TenantLegalDocumentsService) {}

  @RequirePermission('settings:read')
  @Get()
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.docs.list(user.tenantId);
  }

  @RequirePermission('settings:write')
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
    @CurrentUser() user: AccessTokenPayload,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('documentType') documentTypeRaw: string | undefined,
  ) {
    return this.docs.create(
      user.tenantId,
      parseLegalDocumentType(documentTypeRaw),
      file,
    );
  }

  @RequirePermission('settings:read')
  @Get(':documentId/download')
  async download(
    @CurrentUser() user: AccessTokenPayload,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Res() res: Response,
  ) {
    const { row, fullPath } = await this.docs.getFileMetaAndPath(
      user.tenantId,
      documentId,
    );
    res.setHeader('Content-Type', row.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(row.originalFilename)}"`,
    );
    res.sendFile(fullPath);
  }

  @RequirePermission('settings:write')
  @Delete(':documentId')
  remove(
    @CurrentUser() user: AccessTokenPayload,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.docs.remove(user.tenantId, documentId).then(() => ({
      deleted: true,
    }));
  }
}
