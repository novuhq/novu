import { IsBoolean, IsOptional, IsDefined, IsMongoId, IsArray, IsDate } from 'class-validator';

import { Type } from 'class-transformer';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class MarkManyNotificationsAsCommand extends EnvironmentWithSubscriber {
  @IsDefined()
  @IsArray()
  @IsMongoId({ each: true })
  readonly ids: string[];

  @IsOptional()
  @IsBoolean()
  readonly read?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly archived?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly snoozedUntil?: Date | null;
}
