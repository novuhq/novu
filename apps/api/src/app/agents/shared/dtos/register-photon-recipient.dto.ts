import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, Matches } from 'class-validator';

export class RegisterPhotonRecipientRequestDto {
  @ApiProperty({
    type: String,
    description: 'Recipient phone number in E.164 format to register on the Photon shared iMessage line',
    example: '+14155551234',
  })
  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'phoneNumber must be in E.164 format (e.g. +14155551234)' })
  phoneNumber: string;

  @ApiPropertyOptional({
    type: String,
    description: 'When supplied, Photon emails the recipient an opt-in invite (rate-limited to one per 24h)',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class RegisterPhotonRecipientResponseDto {
  @ApiProperty({ type: Boolean, description: 'Whether Photon accepted the registration' })
  success: boolean;

  @ApiPropertyOptional({
    type: String,
    description: 'The shared-pool number Photon assigned to this recipient — the number they text to opt in',
  })
  assignedPhoneNumber?: string;

  @ApiPropertyOptional({ type: Boolean, description: 'True when an opt-in invite email was triggered' })
  inviteSent?: boolean;

  @ApiPropertyOptional({ type: String, description: 'Human-readable message describing a failure' })
  message?: string;
}
