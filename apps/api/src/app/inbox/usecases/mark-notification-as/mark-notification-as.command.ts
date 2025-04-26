import { IsBoolean, IsOptional, IsDefined, IsMongoId, IsDate } from 'class-validator';

import { Type } from 'class-transformer';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class MarkNotificationAsCommand extends EnvironmentWithSubscriber {
  @IsDefined()
  @IsMongoId()
  readonly notificationId: string;

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
