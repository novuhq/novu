import { IsDefined, IsEnum } from 'class-validator';
import { ApiRateLimitCategoryTypeEnum } from '@novu/shared';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class EvaluateApiRateLimitCommand extends EnvironmentCommand {
  @IsDefined()
  @IsEnum(ApiRateLimitCategoryTypeEnum)
  apiRateLimitCategory: ApiRateLimitCategoryTypeEnum;
}
