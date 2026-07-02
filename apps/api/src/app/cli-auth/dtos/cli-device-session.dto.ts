import { ApiProperty } from '@nestjs/swagger';
import type { ApproveCliDeviceSessionRequest, CreateCliDeviceSessionResponse } from '@novu/shared';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCliDeviceSessionRequestDto {
  @ApiProperty({
    type: String,
    required: false,
    description: 'CLI surface identifier (e.g. novu-wizard, novu-connect) for dashboard copy.',
  })
  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateCliDeviceSessionResponseDto implements CreateCliDeviceSessionResponse {
  @ApiProperty({ type: String, description: 'Opaque device code the CLI polls until authorization completes.' })
  deviceCode: string;

  @ApiProperty({ type: Number, description: 'Seconds until this device session expires.' })
  expiresIn: number;

  @ApiProperty({ type: Number, description: 'Minimum seconds the CLI should wait between poll requests.' })
  interval: number;
}

export class CliDeviceSessionPollResponseDto {
  @ApiProperty({ enum: ['pending', 'approved', 'expired'] })
  status: 'pending' | 'approved' | 'expired';

  @ApiProperty({ type: Number, required: false })
  expiresIn?: number;

  @ApiProperty({ type: Number, required: false })
  interval?: number;

  @ApiProperty({ type: String, required: false })
  apiKey?: string;

  @ApiProperty({ type: String, required: false })
  environmentId?: string;

  @ApiProperty({ type: String, required: false, nullable: true })
  environmentSlug?: string | null;

  @ApiProperty({ type: String, required: false, nullable: true })
  environmentName?: string | null;

  @ApiProperty({ type: String, required: false, nullable: true })
  organizationId?: string | null;

  @ApiProperty({ type: Object, required: false, nullable: true })
  user?: {
    id: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
}

export class ApproveCliDeviceSessionRequestDto implements ApproveCliDeviceSessionRequest {
  @ApiProperty({ type: String, description: 'Novu API key for the selected environment.' })
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @ApiProperty({ type: String, description: 'Selected environment id.' })
  @IsString()
  @IsNotEmpty()
  environmentId: string;
}

export class ApproveCliDeviceSessionResponseDto {
  @ApiProperty({ type: Boolean })
  ok: boolean;
}
