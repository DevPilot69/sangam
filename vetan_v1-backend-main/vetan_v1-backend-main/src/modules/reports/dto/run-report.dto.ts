import { IsObject, IsString } from 'class-validator';

export class RunReportDto {
  @IsString()
  reportId!: string;

  @IsObject()
  filters!: Record<string, string | number>;
}
