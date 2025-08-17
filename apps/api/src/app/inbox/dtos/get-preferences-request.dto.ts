import { SeverityLevelEnum } from '@novu/shared';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { IsEnumOrArray } from '../../shared/validators/is-enum-or-array';

export class GetPreferencesRequestDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnumOrArray(SeverityLevelEnum)
  severity?: SeverityLevelEnum | SeverityLevelEnum[];
}
