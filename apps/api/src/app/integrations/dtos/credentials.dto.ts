import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsString } from 'class-validator';

export class CredentialsDto {
  @ApiPropertyOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional()
  @IsString()
  user?: string;

  @ApiPropertyOptional()
  @IsString()
  secretKey?: string;

  @ApiPropertyOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional()
  @IsString()
  host?: string;

  @ApiPropertyOptional()
  @IsString()
  port?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  secure?: boolean;

  @ApiPropertyOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsString()
  accountSid?: string;

  @ApiPropertyOptional()
  @IsString()
  messageProfileId?: string;

  @ApiPropertyOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsString()
  senderName?: string;

  @ApiPropertyOptional()
  @IsString()
  projectName?: string;

  @ApiPropertyOptional()
  @IsString()
  applicationId?: string;

  @ApiPropertyOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  requireTls?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  ignoreTls?: boolean;

  @ApiPropertyOptional()
  @IsObject()
  tlsOptions?: Record<string, unknown>;
}
