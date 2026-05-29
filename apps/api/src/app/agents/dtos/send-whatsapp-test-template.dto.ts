import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SendWhatsAppTestTemplateRequestDto {
  @ApiProperty({
    type: String,
    description:
      'Novu subscriber ID whose phone field receives the hello_world WhatsApp template. The dashboard patches subscriber.phone before calling this endpoint.',
    example: 'connect:user-123',
  })
  @IsString()
  @IsNotEmpty()
  subscriberId: string;
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
