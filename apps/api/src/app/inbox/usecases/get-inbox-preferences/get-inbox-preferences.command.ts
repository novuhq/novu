import { SeverityLevelEnum } from '@novu/shared';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class GetInboxPreferencesCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly tags?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(SeverityLevelEnum, { each: true })
  readonly severity?: SeverityLevelEnum[];
}
