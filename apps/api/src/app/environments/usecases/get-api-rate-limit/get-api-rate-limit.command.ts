import { IsDefined, IsEnum } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { ApiRateLimitCategoryTypeEnum } from 'libs/shared/dist/cjs';

export class GetApiRateLimitCommand extends EnvironmentCommand {
  @IsDefined()
  @IsEnum(ApiRateLimitCategoryTypeEnum)
  apiRateLimitCategory: ApiRateLimitCategoryTypeEnum;
}
