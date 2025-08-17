import { IsArray, IsMongoId, IsOptional, IsString } from 'class-validator';

export class MarkNotificationsAsSeenRequestDto {
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  notificationIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  data?: string;
}
