import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { SkipControlDto } from './skip.dto';

export class SmsControlDto extends SkipControlDto {
  @ApiPropertyOptional({ description: 'Content of the SMS message.' })
  @IsString()
  @IsOptional()
  body: string;
}
