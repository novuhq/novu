import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GetRequestTracesDto {
  @ApiProperty({
    description: 'Request identifier to fetch traces for',
    example: 'req_123456789',
  })
  @IsString()
  requestId: string;
}
