import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SendWhatsAppTestTemplateRequestDto {
  @ApiProperty({
    type: String,
    description: 'E.164 phone number (with or without leading +) to receive the hello_world WhatsApp template',
    example: '+14155551234',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'to must be a valid E.164 phone number' })
  to: string;
}

export class SendWhatsAppTestTemplateErrorDto {
  @ApiProperty({
    type: String,
    description: 'Machine-readable failure code',
    enum: [
      'missing_credentials',
      'recipient_not_allowed',
      'token_expired',
      'template_unavailable',
      'invalid_recipient',
      'rate_limited',
      'meta_rejected',
      'unknown',
    ],
  })
  code: string;

  @ApiProperty({ type: String, description: 'Human-readable message safe to surface in the dashboard' })
  message: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Optional Meta dev-console URL the dashboard can render as a button to take corrective action',
  })
  helpUrl?: string;
}

export class SendWhatsAppTestTemplateResponseDto {
  @ApiProperty({ type: Boolean, description: 'Whether Meta accepted the send request' })
  success: boolean;

  @ApiPropertyOptional({ type: String, description: 'Meta-assigned message ID for the queued template send' })
  messageId?: string;

  @ApiPropertyOptional({ type: SendWhatsAppTestTemplateErrorDto, description: 'Populated when success is false' })
  error?: SendWhatsAppTestTemplateErrorDto;
}
