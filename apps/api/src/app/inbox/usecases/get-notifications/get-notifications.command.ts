import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { CursorPaginationParams } from '../../../shared/types';
import { IsMongoIdOrNumber } from '../../../shared/validators/mongo-id-or-number';

export class GetNotificationsCommand extends EnvironmentWithSubscriber implements CursorPaginationParams {
  @IsInt()
  @Min(1)
  @Max(100)
  readonly limit: number;

  @IsOptional()
  @IsMongoIdOrNumber()
  readonly after: string | number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly tags?: string[];

  @IsOptional()
  @IsBoolean()
  readonly read?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly archived?: boolean;
}
