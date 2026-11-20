import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class StartPhotonDeviceAuthResponseDto {
  @ApiProperty({
    type: Boolean,
    description:
      'Whether the Photon connect flow is available. When false the dashboard should fall back to manual credential entry.',
  })
  available: boolean;

  @ApiPropertyOptional({ type: String, description: 'Why connect is unavailable, when available is false' })
  reason?: string;

  @ApiPropertyOptional({ type: String, description: 'Short code the user types on the Photon verification page' })
  userCode?: string;

  @ApiPropertyOptional({ type: String, description: 'Photon verification page URL' })
  verificationUri?: string;

  @ApiPropertyOptional({ type: String, description: 'Verification URL with the user code prefilled' })
  verificationUriComplete?: string;

  @ApiPropertyOptional({
    type: String,
    description:
      'Opaque device-flow handle to pass back on each poll. The token exchange itself only happens inside the Novu API.',
  })
  deviceCode?: string;

  @ApiPropertyOptional({ type: Number, description: 'Poll cadence in seconds' })
  interval?: number;

  @ApiPropertyOptional({ type: Number, description: 'Device-code lifetime in seconds' })
  expiresIn?: number;
}

export class PollPhotonDeviceAuthRequestDto {
  @ApiProperty({ type: String, description: 'The deviceCode returned by the start endpoint' })
  @IsString()
  @IsNotEmpty()
  deviceCode: string;
}

export class PollPhotonDeviceAuthErrorDto {
  @ApiProperty({ type: String, description: 'Machine-readable failure code' })
  code: string;

  @ApiProperty({ type: String, description: 'Human-readable message safe to surface in the dashboard' })
  message: string;
}

export class PollPhotonDeviceAuthResponseDto {
  @ApiProperty({
    type: String,
    description: 'Device-flow status',
    enum: ['pending', 'slow_down', 'complete', 'expired', 'denied', 'error'],
  })
  status: string;

  @ApiPropertyOptional({
    type: String,
    description: 'The provisioned Photon project id (non-secret), populated on complete',
  })
  projectId?: string;

  @ApiPropertyOptional({ type: String, description: 'Non-fatal setup caveats to surface in the guide' })
  warning?: string;

  @ApiPropertyOptional({ type: PollPhotonDeviceAuthErrorDto, description: 'Populated when status is error' })
  error?: PollPhotonDeviceAuthErrorDto;
}
