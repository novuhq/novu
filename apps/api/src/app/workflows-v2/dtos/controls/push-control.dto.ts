import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { SkipControlDto } from './skip.dto';

export class PushControlDto extends SkipControlDto {
  @ApiPropertyOptional({ description: 'Subject/title of the push notification.' })
  @IsString()
  @IsOptional()
  subject: string;

  @ApiPropertyOptional({ description: 'Body content of the push notification.' })
  @IsString()
  @IsOptional()
  body: string;
}
