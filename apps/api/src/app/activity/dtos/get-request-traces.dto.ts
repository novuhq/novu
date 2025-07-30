import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetRequestTracesDto {
  @ApiProperty({
    description: 'Request identifier to fetch traces for',
    example: 'req_123456789'
  })
  @IsString()
  requestId: string;
} 
