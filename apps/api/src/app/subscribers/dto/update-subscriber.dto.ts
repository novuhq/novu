import { IsEmail, IsOptional, IsString, IsArray } from 'class-validator';
import { ISubscriberChannel, IUpdateSubscriberDto } from '@novu/shared';

export class UpdateSubscriberBodyDto implements IUpdateSubscriberDto {
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

  @IsOptional()
  channel: ISubscriberChannel;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  notificationIdentifiers?: string[];
}
