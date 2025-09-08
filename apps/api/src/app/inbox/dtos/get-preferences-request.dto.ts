import { SeverityLevelEnum, WorkflowCriticalityEnum } from '@novu/shared';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { IsEnumOrArray } from '../../shared/validators/is-enum-or-array';

export class GetPreferencesRequestDto {
  @IsEnum(WorkflowCriticalityEnum)
  @IsOptional()
  criticality: WorkflowCriticalityEnum = WorkflowCriticalityEnum.NON_CRITICAL;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnumOrArray(SeverityLevelEnum)
  severity?: SeverityLevelEnum | SeverityLevelEnum[];
}
