import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TenantLegalDocument, TenantLegalDocumentType } from '@prisma/client';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { EnvVars } from '../../config/validate-env';
import { PrismaService } from '../../database/prisma.service';

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

const ALLOWED_EXT = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

const MAX_BYTES = 15 * 1024 * 1024;

export type TenantLegalDocumentDto = {
  id: string;
  tenantId: string;
  documentType: TenantLegalDocumentType;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

@Injectable()
export class TenantLegalDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvVars, true>,
  ) {}

  private resolveBaseDir(): string {
    const raw = this.config.get('LEGAL_DOCUMENTS_DIR', { infer: true });
    return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
  }

  private tenantDir(tenantId: string): string {
    return path.join(this.resolveBaseDir(), tenantId);
  }

  private mapRow(row: TenantLegalDocument): TenantLegalDocumentDto {
    return {
      id: row.id,
      tenantId: row.tenantId,
      documentType: row.documentType,
      originalFilename: row.originalFilename,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async assertTenantExists(tenantId: string): Promise<void> {
    const t = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });
    if (!t) throw new NotFoundException('Tenant not found');
  }

  async list(tenantId: string): Promise<TenantLegalDocumentDto[]> {
    await this.assertTenantExists(tenantId);
    const rows = await this.prisma.tenantLegalDocument.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.mapRow(r));
  }

  async create(
    tenantId: string,
    documentType: TenantLegalDocumentType,
    file: Express.Multer.File | undefined,
  ): Promise<TenantLegalDocumentDto> {
    await this.assertTenantExists(tenantId);
    if (!file?.buffer?.length) {
      throw new BadRequestException('File is required');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('File too large (max 15 MB)');
    }
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      throw new BadRequestException(
        'Only PDF, JPEG, or PNG files are allowed',
      );
    }
    const ext = path.extname(file.originalname).toLowerCase() || '';
    if (!ALLOWED_EXT.has(ext)) {
      throw new BadRequestException(
        'Invalid extension — use .pdf, .jpg, or .png',
      );
    }

    const safeOriginal =
      path.basename(file.originalname).replace(/[^\w.\-()+ ]/g, '_') ||
      'document';

    const storedFilename = `${uuidv4()}${ext}`;
    const dir = this.tenantDir(tenantId);
    await fs.mkdir(dir, { recursive: true });
    const fullPath = path.join(dir, storedFilename);
    await fs.writeFile(fullPath, file.buffer);

    try {
      const row = await this.prisma.tenantLegalDocument.create({
        data: {
          tenantId,
          documentType,
          originalFilename: safeOriginal.slice(0, 255),
          storedFilename,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        },
      });
      return this.mapRow(row);
    } catch (e) {
      await fs.unlink(fullPath).catch(() => undefined);
      throw e;
    }
  }

  async getFileMetaAndPath(
    tenantId: string,
    documentId: string,
  ): Promise<{ row: TenantLegalDocument; fullPath: string }> {
    const row = await this.prisma.tenantLegalDocument.findFirst({
      where: { id: documentId, tenantId },
    });
    if (!row) throw new NotFoundException('Document not found');
    const fullPath = path.join(this.tenantDir(tenantId), row.storedFilename);
    try {
      await fs.access(fullPath);
    } catch {
      throw new NotFoundException('File not found on server');
    }
    return { row, fullPath };
  }

  async remove(tenantId: string, documentId: string): Promise<void> {
    const row = await this.prisma.tenantLegalDocument.findFirst({
      where: { id: documentId, tenantId },
    });
    if (!row) throw new NotFoundException('Document not found');
    const fullPath = path.join(this.tenantDir(tenantId), row.storedFilename);
    await this.prisma.tenantLegalDocument.delete({ where: { id: documentId } });
    await fs.unlink(fullPath).catch(() => undefined);
  }
}
