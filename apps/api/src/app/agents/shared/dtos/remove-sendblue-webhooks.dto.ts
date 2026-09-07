import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class RemoveSendblueWebhooksRequestDto {
  @ApiProperty({
    type: [String],
    description:
      'Stale Novu agent webhook URLs to remove from the Sendblue account (e.g. surfaced via ' +
      '`existingNovuWebhookUrls` from the configure-webhook response). Only URLs matching the ' +
      'Novu agent webhook shape are actually removed — any other URL supplied here is ignored.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  webhookUrls: string[];
}

export class RemoveSendblueWebhooksResponseDto {
  @ApiProperty({ type: Boolean, description: 'Whether Novu successfully removed the requested webhooks from Sendblue' })
  success: boolean;

  @ApiProperty({
    type: [String],
    description: 'The webhook URLs actually removed (after filtering out any non-Novu-shaped URLs)',
  })
  removedWebhookUrls: string[];

  @ApiPropertyOptional({
    type: String,
    description: 'Human-readable message describing a failure, when success is false',
  })
  message?: string;
}
