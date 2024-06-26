import { IsBoolean, IsOptional, IsDefined, IsMongoId } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class UpdateNotificationCommand extends EnvironmentWithSubscriber {
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
  @IsBoolean()
  readonly primaryActionCompleted?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly secondaryActionCompleted?: boolean;
}
