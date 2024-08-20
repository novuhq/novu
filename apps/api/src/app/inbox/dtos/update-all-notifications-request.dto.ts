import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateAllNotificationsRequestDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
