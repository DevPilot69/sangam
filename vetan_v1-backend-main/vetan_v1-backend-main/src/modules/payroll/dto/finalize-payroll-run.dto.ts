import { Equals, IsString } from 'class-validator';

export class FinalizePayrollRunDto {
  @IsString()
  @Equals('CONFIRM')
  confirmText!: 'CONFIRM';
}
