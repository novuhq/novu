import { IsArray, IsMongoId, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class MarkNotificationsAsSeenCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  readonly notificationIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly tags?: string[];

  @IsOptional()
  @IsString()
  readonly data?: string;
}
