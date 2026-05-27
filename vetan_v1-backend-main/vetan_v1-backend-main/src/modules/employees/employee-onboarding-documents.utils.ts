import { BadRequestException } from '@nestjs/common';
import { EmployeeOnboardingDocumentType } from '@prisma/client';

const VALUES = new Set<string>(Object.values(EmployeeOnboardingDocumentType));

export function parseEmployeeOnboardingDocumentType(
  raw: string | undefined,
): EmployeeOnboardingDocumentType {
  const normalized = (raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_');
  if (!VALUES.has(normalized)) {
    throw new BadRequestException(`Invalid documentType: ${raw ?? '(empty)'}`);
  }
  return normalized as EmployeeOnboardingDocumentType;
}
