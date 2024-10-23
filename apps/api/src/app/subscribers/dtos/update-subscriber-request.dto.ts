import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, IsLocale, IsOptional, IsString } from 'class-validator';
import { SubscriberCustomData } from '@novu/shared';
import { Transform } from 'class-transformer';
import { SubscriberChannelDto } from './create-subscriber-request.dto';

export class UpdateSubscriberRequestDto {
  @ApiProperty()
  @Transform((params) => (params.value === '' ? null : params.value))
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty()
  @IsLocale()
  @IsOptional()
  locale?: string;

  @ApiProperty()
  @IsOptional()
  data?: SubscriberCustomData;

  @ApiProperty()
  @IsOptional()
  @IsArray()
  channels?: SubscriberChannelDto[];
}
