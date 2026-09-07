import { ApiRateLimitCategoryEnum } from '@novu/shared';
import { IsDefined, IsEnum } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetApiRateLimitMaximumCommand extends EnvironmentCommand {
  @IsDefined()
  @IsEnum(ApiRateLimitCategoryEnum)
  apiRateLimitCategory: ApiRateLimitCategoryEnum;
}
