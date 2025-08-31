import { SeverityLevelEnum, WorkflowCriticalityEnum } from '@novu/shared';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { IsEnumOrArray } from '../../../shared/validators/is-enum-or-array';

export class GetInboxPreferencesCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly tags?: string[];

  @IsOptional()
  @IsEnumOrArray(SeverityLevelEnum)
  readonly severity?: SeverityLevelEnum | SeverityLevelEnum[];

  @IsOptional()
  @IsEnum(WorkflowCriticalityEnum)
  readonly criticality: WorkflowCriticalityEnum;
}
