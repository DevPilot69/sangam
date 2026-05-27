import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import type { TenantLiveStatus } from '../platform-tenant.utils';

const OPERATIONAL_STATUSES = [
  'LIVE',
  'TRIAL',
  'SETUP',
  'PAST_DUE',
  'CHURNED',
] as const;

export type OperationalStatusDto = (typeof OPERATIONAL_STATUSES)[number];

export class UpdateTenantOperationalStatusDto {
  @ApiProperty({ enum: OPERATIONAL_STATUSES })
  @IsEnum(OPERATIONAL_STATUSES)
  operationalStatus!: TenantLiveStatus;
}
