import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class IssueSlackSetupLinkRequestDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Subscriber the Slack install should connect. Omit for dashboard-issued links.',
  })
  @IsOptional()
  @IsString()
  subscriberId?: string;
}

export class IssueSlackSetupLinkResponseDto {
  @ApiProperty({ type: String, description: 'Opaque setup token identifying this setup session' })
  token: string;

  @ApiProperty({
    type: String,
    description: 'Absolute URL the user opens to paste their Slack App Configuration Token',
  })
  url: string;

  @ApiProperty({ type: String, description: 'ISO-8601 expiry timestamp' })
  expiresAt: string;
}
