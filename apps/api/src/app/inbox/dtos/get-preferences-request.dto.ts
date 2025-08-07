import { SeverityLevelEnum } from '@novu/shared';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class GetPreferencesRequestDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(SeverityLevelEnum, { each: true })
  severity?: SeverityLevelEnum[];
}
