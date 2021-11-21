import { IsBoolean, IsDefined } from 'class-validator';

export class ChangeTemplateStatusDto {
  @IsDefined()
  @IsBoolean()
  active: boolean;
}
