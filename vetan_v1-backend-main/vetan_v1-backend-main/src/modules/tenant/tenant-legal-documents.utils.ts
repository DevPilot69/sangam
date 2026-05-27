import { BadRequestException } from '@nestjs/common';
import { TenantLegalDocumentType } from '@prisma/client';

export function parseLegalDocumentType(raw: unknown): TenantLegalDocumentType {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new BadRequestException('documentType is required');
  }
  const v = raw.trim() as TenantLegalDocumentType;
  if (!Object.values(TenantLegalDocumentType).includes(v)) {
    throw new BadRequestException(`Invalid documentType: ${raw}`);
  }
  return v;
}
