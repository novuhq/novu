import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';
import { SkipControlDto } from './skip.dto';

export class PushControlDto extends SkipControlDto {
  @ApiProperty({ description: 'Subject/title of the push notification.' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Body content of the push notification.' })
  @IsString()
  body: string;
}
