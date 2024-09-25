import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class GetPreferencesRequestDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  critical?: boolean;
}
