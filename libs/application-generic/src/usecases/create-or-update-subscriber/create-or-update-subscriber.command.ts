import { SubscriberEntity } from '@novu/dal';
import { ISubscriberChannel, SubscriberCustomData } from '@novu/shared';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsLocale,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsTimeZone,
  ValidateIf,
} from 'class-validator';

import { EnvironmentCommand } from '../../commands';

export class CreateOrUpdateSubscriberCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  subscriberId: string;

  @IsOptional()
  @ValidateIf((obj) => obj.email !== null)
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @ValidateIf((obj) => obj.firstName !== null)
  @IsString()
  firstName?: string | null;

  @IsOptional()
  @ValidateIf((obj) => obj.lastName !== null)
  @IsString()
  lastName?: string | null;

  @IsOptional()
  @ValidateIf((obj) => obj.phone !== null)
  @IsString()
  phone?: string | null;

  @IsOptional()
  @ValidateIf((obj) => obj.avatar !== null)
  @IsString()
  avatar?: string | null;

  @IsOptional()
  @ValidateIf((obj) => obj.locale !== null)
  @IsLocale()
  locale?: string | null;

  @IsOptional()
  data?: SubscriberCustomData | null;

  @IsOptional()
  @ValidateIf((obj) => obj.timezone !== null)
  @IsTimeZone()
  timezone?: string | null;

  /**
   * Represents existing entity that will be used for updating subscriber instead of creating one
   * @optional
   */
  @IsOptional()
  subscriber?: SubscriberEntity;

  @IsOptional()
  channels?: ISubscriberChannel[];
  /**
   * Represents the name of the active worker that is processing the subscriber for debugging and logging
   */
  @IsOptional()
  activeWorkerName?: string;

  @IsOptional()
  @IsBoolean()
  allowUpdate?: boolean = true;

  @IsOptional()
  @IsBoolean()
  failIfExists?: boolean = false;
}
