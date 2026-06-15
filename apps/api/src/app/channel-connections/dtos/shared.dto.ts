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
}

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
