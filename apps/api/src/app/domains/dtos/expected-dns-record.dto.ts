import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExpectedDnsRecordDto {
  @ApiProperty({ example: 'MX' })
  type: string;

  @ApiProperty({ example: 'inbound' })
  name: string;

  @ApiProperty({ example: 'inbound-smtp.us-east-1.amazonaws.com' })
  content: string;

  @ApiProperty({ example: 'Auto' })
  ttl: string;

  @ApiPropertyOptional({ example: 10 })
  priority?: number;
}
