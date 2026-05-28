import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCliDeviceSessionRequestDto {
  @ApiPropertyOptional({
    type: String,
    description: 'CLI surface identifier (e.g. novu-wizard, novu-connect) for dashboard copy.',
  })
  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateCliDeviceSessionResponseDto {
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

  @ApiPropertyOptional({ type: Number })
  expiresIn?: number;

  @ApiPropertyOptional({ type: Number })
  interval?: number;

  @ApiPropertyOptional({ type: String })
  apiKey?: string;

  @ApiPropertyOptional({ type: String })
  environmentId?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  environmentSlug?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  environmentName?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  organizationId?: string | null;

  @ApiPropertyOptional({
    type: 'object',
    nullable: true,
    additionalProperties: true,
    description: 'Novu user metadata forwarded to the CLI after authorization.',
  })
  user?: {
    id: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
}

export class ApproveCliDeviceSessionRequestDto {
  @ApiProperty({ type: String, description: 'Novu API key for the selected environment.' })
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @ApiProperty({ type: String, description: 'Selected environment id.' })
  @IsString()
  @IsNotEmpty()
  environmentId: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  environmentSlug?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  environmentName?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  organizationId?: string | null;

  @ApiPropertyOptional({
    type: 'object',
    nullable: true,
    additionalProperties: true,
  })
  @IsOptional()
  user?: {
    id: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
}

export class ApproveCliDeviceSessionResponseDto {
  @ApiProperty({ type: Boolean })
  ok: boolean;
}
