import {
  IsEmail,
  IsLocale,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { SubscriberEntity } from '@novu/dal';
import { SubscriberCustomData } from '@novu/shared';

import { EnvironmentCommand } from '../../commands/project.command';

export class CreateSubscriberCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.toString().trim())
  subscriberId: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
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
