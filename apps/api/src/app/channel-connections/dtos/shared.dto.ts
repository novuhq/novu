import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';

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

/**
 * Request shape — accepts the provider access token on create/update so that
 * SDK callers can rotate or seed credentials. Never echoed back in responses.
 */
export class AuthDto {
  @ApiProperty({ example: 'Workspace access token' })
  @IsDefined()
  @IsString()
  accessToken: string;
}

/**
 * Response shape — exposes credential presence only.
 *
 * The stored `auth.accessToken` is a provider bearer token (Slack / MS Teams /
 * etc.) usable outside Novu, so it must never be returned over the public API.
 * This presence-only shape lets clients render "Connected" UI without giving
 * any caller with `INTEGRATION_READ` the ability to exfiltrate live tokens.
 */
export class AuthResponseDto {
  @ApiProperty({
    description:
      'Indicates whether a provider access token is stored on this channel connection. ' +
      'The token itself is never returned for security reasons — to rotate it, send a new value via PATCH.',
    type: Boolean,
    example: true,
  })
  @IsDefined()
  @IsBoolean()
  hasAccessToken: boolean;
}
