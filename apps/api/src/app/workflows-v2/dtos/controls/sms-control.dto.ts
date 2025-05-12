import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { SkipControlDto } from './skip.dto';

export class SmsControlDto extends SkipControlDto {
  @ApiProperty({ description: 'Content of the SMS message.' })
  @IsString()
  body: string;
}
