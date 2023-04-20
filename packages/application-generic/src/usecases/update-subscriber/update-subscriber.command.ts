import { IsEmail, IsLocale, IsOptional, IsString } from 'class-validator';
import { SubscriberEntity } from '@novu/dal';
import { SubscriberCustomData } from '@novu/shared';

import { EnvironmentCommand } from '../../commands/project.command';

export class UpdateSubscriberCommand extends EnvironmentCommand {
  @IsString()
  subscriberId: string;

  @IsOptional()
  firstName?: string;

  @IsOptional()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsLocale()
  @IsOptional()
  locale?: string;

  @IsOptional()
  data?: SubscriberCustomData;

  @IsOptional()
  subscriber?: SubscriberEntity;
}
