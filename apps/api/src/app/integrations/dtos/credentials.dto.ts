import { ApiPropertyOptional } from '@nestjs/swagger';

export class CredentialsDto {
  @ApiPropertyOptional()
  apiKey?: string;
  @ApiPropertyOptional()
  user?: string;
  @ApiPropertyOptional()
  secretKey?: string;
  @ApiPropertyOptional()
  domain?: string;
  @ApiPropertyOptional()
  password?: string;
  @ApiPropertyOptional()
  host?: string;
  @ApiPropertyOptional()
  port?: string;
  @ApiPropertyOptional()
  secure?: boolean;
  @ApiPropertyOptional()
  region?: string;
  @ApiPropertyOptional()
  accountSid?: string;
  @ApiPropertyOptional()
  messageProfileId?: string;
  @ApiPropertyOptional()
  token?: string;
  @ApiPropertyOptional()
  from?: string;
  @ApiPropertyOptional()
  senderName?: string;
  @ApiPropertyOptional()
  projectName?: string;
  @ApiPropertyOptional()
  applicationId?: string;
  @ApiPropertyOptional()
  clientId?: string;
}
