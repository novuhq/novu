import { SubscriberEntity } from '@novu/dal';
import { ISubscriberChannel, SubscriberCustomData } from '@novu/shared';
import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsLocale,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsTimeZone,
  ValidateIf,
} from 'class-validator';
import { EnvironmentCommand } from '../../commands';

export class UpdateSubscriberCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  @IsNotEmpty({
    message: 'SubscriberId is required',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  subscriberId: string;

  @IsOptional()
  @ValidateIf((obj) => obj.firstName !== null)
  @IsString()
  firstName?: string | null;

  @IsOptional()
  @ValidateIf((obj) => obj.lastName !== null)
  @IsString()
  lastName?: string | null;

  @IsOptional()
  @ValidateIf((obj) => obj.email !== null)
  @IsEmail()
  email?: string | null;

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
  @ValidateIf((obj) => obj.timezone !== null)
  @IsTimeZone()
  timezone?: string | null;

  @IsOptional()
  @ValidateIf((obj) => obj.data !== null)
  @IsObject()
  data?: SubscriberCustomData | null;

  @IsOptional()
  subscriber?: SubscriberEntity;

  @IsOptional()
  channels?: ISubscriberChannel[];
}
