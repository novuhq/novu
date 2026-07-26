import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsOptional, IsString } from 'class-validator';

export class WorkspaceDto {
  @ApiProperty({ example: 'T123456' })
  @IsDefined()
  @IsString()
  id: string;

  @ApiPropertyOptional({ example: 'Acme HQ' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'U0123456789' })
  @IsOptional()
  @IsString()
  botUserId?: string;
}

/**
 * Request-only shape: accepts a `refreshToken` on create/update so rotation can be
 * configured or re-established (e.g. pasting a fresh Slack refresh token). Never used
 * to describe a response — see `AuthResponseDto` for what is actually returned.
 */
export class AuthDto {
  @ApiProperty({ example: 'Workspace access token' })
  @IsDefined()
  @IsString()
  accessToken: string;

  @ApiPropertyOptional({ example: 'Workspace refresh token' })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiPropertyOptional({ example: '2026-06-15T12:00:00.000Z' })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: '2026-09-15T12:00:00.000Z' })
  @IsOptional()
  @IsString()
  refreshTokenExpiresAt?: string;
}

/**
 * Response-only shape: returns the access token only. Refresh tokens and expiry
 * metadata are never echoed — expiry is used internally for rotation.
 */
export class AuthResponseDto {
  @ApiProperty({ example: 'Workspace access token' })
  accessToken: string;
}
