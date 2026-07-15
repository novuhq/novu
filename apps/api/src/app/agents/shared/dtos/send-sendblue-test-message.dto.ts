import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendSendblueTestMessageRequestDto {
  @ApiProperty({
    type: String,
    description:
      'Novu subscriber ID whose phone field receives the Sendblue test message. The dashboard patches subscriber.phone before calling this endpoint.',
    example: 'connect:user-123',
  })
  @IsString()
  @IsNotEmpty()
  subscriberId: string;
}

export class SendSendblueTestMessageErrorDto {
  @ApiProperty({
    type: String,
    description: 'Machine-readable failure code',
    enum: ['missing_credentials', 'invalid_recipient', 'recipient_not_verified', 'sendblue_rejected', 'unknown'],
  })
  code: string;

  @ApiProperty({ type: String, description: 'Human-readable message safe to surface in the dashboard' })
  message: string;
}

export class SendSendblueTestMessageResponseDto {
  @ApiProperty({ type: Boolean, description: 'Whether Sendblue accepted the send request' })
  success: boolean;

  @ApiPropertyOptional({ type: String, description: 'Sendblue-assigned message handle for the queued send' })
  messageId?: string;

  @ApiPropertyOptional({ type: SendSendblueTestMessageErrorDto, description: 'Populated when success is false' })
  error?: SendSendblueTestMessageErrorDto;
}
