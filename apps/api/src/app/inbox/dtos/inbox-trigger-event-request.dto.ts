import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { TriggerRecipientsPayload } from '@novu/shared';
import { IsDefined, IsObject, IsOptional, IsString } from 'class-validator';
import { SubscriberPayloadDto } from '../../events/dtos/trigger-event-request.dto';

/**
 * Request DTO for the inbox `/events` endpoint. Intentionally a minimal,
 * inbox-only contract that does **not** expose `bridgeUrl`, `controls`,
 * `overrides`, `actor`, `tenant`, `transactionId`, `context` or any other
 * field that could be abused by a subscriber JWT to drive server-side bridge
 * requests or escalate privileges. Compare with `TriggerEventRequestDto`,
 * which is reserved for trusted (API-key authenticated) callers.
 */
@ApiExtraModels(SubscriberPayloadDto)
export class InboxTriggerEventRequestDto {
  @ApiProperty({
    description:
      'The trigger identifier of the workflow you wish to send. For inbox subscribers this must be the keyless demo workflow.',
    example: 'hello-world',
  })
  @IsString()
  @IsDefined()
  name: string;

  @ApiPropertyOptional({
    description: 'Custom payload forwarded to the workflow.',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;

  @ApiProperty({
    description:
      'Recipient of the inbox event. Must resolve to the authenticated subscriber; topic and array recipients are rejected by the use case.',
    oneOf: [
      {
        type: 'string',
        description: 'Subscriber id of the authenticated inbox session.',
        example: 'SUBSCRIBER_ID',
      },
      { $ref: getSchemaPath(SubscriberPayloadDto) },
    ],
  })
  @IsDefined()
  to: TriggerRecipientsPayload;
}
