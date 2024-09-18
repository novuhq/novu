import { IsArray, IsOptional, IsString } from 'class-validator';

export class GetPreferencesRequestDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
