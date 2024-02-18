import { IsDefined, IsEnum } from 'class-validator';
import { ApiRateLimitCategoryEnum } from '@novu/shared';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetApiRateLimitMaximumCommand extends EnvironmentCommand {
  @IsDefined()
  @IsEnum(ApiRateLimitCategoryEnum)
  apiRateLimitCategory: ApiRateLimitCategoryEnum;
}
