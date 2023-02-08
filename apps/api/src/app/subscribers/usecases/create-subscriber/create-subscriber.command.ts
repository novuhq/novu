import { IsEmail, IsLocale, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { Transform } from 'class-transformer';
import { SubscriberEntity } from '@novu/dal';
import { isMap } from 'util/types';

export class CreateSubscriberCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
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
  data?: { [key: string]: string };

  @IsOptional()
  subscriber?: SubscriberEntity;
}
