import { IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiRateLimitCategoryEnum, ApiRateLimitCostEnum } from '@novu/shared';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class EvaluateApiRateLimitCommand extends EnvironmentCommand {
  @IsDefined()
  @IsEnum(ApiRateLimitCategoryEnum)
  apiRateLimitCategory: ApiRateLimitCategoryEnum;

  @IsDefined()
  @IsEnum(ApiRateLimitCostEnum)
  apiRateLimitCost: ApiRateLimitCostEnum;

  @IsOptional()
  @IsString()
  ip?: string;
}
