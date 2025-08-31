import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GetRequestRequestDto {
  @ApiProperty({
    description: 'Request identifier',
    example: 'req_123456789',
  })
  @IsString()
  requestId: string;
}
