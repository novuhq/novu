import { IsDefined, IsObject, IsOptional, IsString, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiExtraModels, ApiHideProperty, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import {
  TriggerRecipientsPayload,
  TriggerRecipientsTypeEnum,
  TriggerRecipientSubscriber,
  TriggerTenantContext,
} from '@novu/shared';
import { CreateSubscriberRequestDto } from '../../subscribers/dtos';
import { UpdateTenantRequestDto } from '../../tenant/dtos';
import { SdkApiProperty } from '../../shared/framework/swagger/sdk.decorators';

export class WorkflowToStepControlValuesDto {
  /**
   * A mapping of step IDs to their corresponding data.
   * Built for stateless triggering by the local studio, those values will not be persisted outside of the job scope
   * First key is step id, second is controlId, value is the control value
   * @type {Record<stepId, Data>}
   * @optional
   */
  @ApiProperty({
    description: 'A mapping of step IDs to their corresponding data.',
    type: 'object',
    additionalProperties: {
      type: 'object',
      additionalProperties: true, // Allows any additional properties
    },
    required: false, // Indicates that this property is optional
  })
  steps?: Record<string, Record<string, unknown>>;
}

export class SubscriberPayloadDto extends CreateSubscriberRequestDto {}
export class TenantPayloadDto extends UpdateTenantRequestDto {}

export class TopicPayloadDto {
  @ApiProperty()
  topicKey: string;

  @ApiProperty({
    enum: [...Object.values(TriggerRecipientsTypeEnum)],
    enumName: 'TriggerRecipientsTypeEnum',
  })
  type: TriggerRecipientsTypeEnum;
}

@ApiExtraModels(SubscriberPayloadDto, TenantPayloadDto, TopicPayloadDto)
export class TriggerEventRequestDto {
  @SdkApiProperty(
    {
      description:
        'The trigger identifier of the workflow you wish to send. This identifier can be found on the workflow page.',
      example: 'workflow_identifier',
    },
    { nameOverride: 'workflowId' }
  )
  @IsString()
  @IsDefined()
  name: string;

  @ApiProperty({
    description: `The payload object is used to pass additional custom information that could be 
    used to render the workflow, or perform routing rules based on it. 
      This data will also be available when fetching the notifications feed from the API to display certain parts of the UI.`,
    type: 'object',
    required: false,
    additionalProperties: true,
    example: {
      comment_id: 'string',
      post: {
        text: 'string',
      },
    },
  })
  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;

  @ApiHideProperty()
  @IsString()
  @IsOptional()
  bridgeUrl?: string;

  @ApiPropertyOptional({
    description: 'This could be used to override provider specific configurations',
    example: {
      fcm: {
        data: {
          key: 'value',
        },
      },
    },
    type: 'object',
    additionalProperties: {
      type: 'object',
      additionalProperties: true, // Allows any additional properties
    },
    required: false, // Indicates that this property is optional
  })
  @IsObject()
  @IsOptional()
  overrides?: Record<string, Record<string, unknown>>;

  @ApiProperty({
    description: 'The recipients list of people who will receive the notification.',
    oneOf: [
      {
        type: 'array',
        items: {
          oneOf: [
            {
              $ref: getSchemaPath(SubscriberPayloadDto),
            },
            {
              $ref: getSchemaPath(TopicPayloadDto),
            },
            {
              type: 'string',
              description: 'Unique identifier of a subscriber in your systems',
              example: 'SUBSCRIBER_ID',
            },
          ],
        },
      },
      {
        type: 'string',
        description: 'Unique identifier of a subscriber in your systems',
        example: 'SUBSCRIBER_ID',
      },
      {
        $ref: getSchemaPath(SubscriberPayloadDto),
      },
      {
        $ref: getSchemaPath(TopicPayloadDto),
      },
    ],
  })
  @IsDefined()
  to: TriggerRecipientsPayload;

  @ApiPropertyOptional({
    description: 'A unique identifier for this transaction, we will generate a UUID if not provided.',
  })
  @IsString()
  @IsOptional()
  transactionId?: string;

  @ApiProperty({
    description: `It is used to display the Avatar of the provided actor's subscriber id or actor object.
    If a new actor object is provided, we will create a new subscriber in our system`,
    oneOf: [
      { type: 'string', description: 'Unique identifier of a subscriber in your systems' },
      { $ref: getSchemaPath(SubscriberPayloadDto) },
    ],
    required: false,
  })
  @IsOptional()
  @ValidateIf((_, value) => typeof value !== 'string')
  @ValidateNested()
  @Type(() => SubscriberPayloadDto)
  actor?: TriggerRecipientSubscriber;

  @ApiProperty({
    description: `It is used to specify a tenant context during trigger event.
    Existing tenants will be updated with the provided details.`,
    oneOf: [
      { type: 'string', description: 'Unique identifier of a tenant in your system' },
      { $ref: getSchemaPath(TenantPayloadDto) },
    ],
    required: false,
  })
  @IsOptional()
  @ValidateIf((_, value) => typeof value !== 'string')
  @ValidateNested()
  @Type(() => TenantPayloadDto)
  tenant?: TriggerTenantContext;

  @ApiHideProperty()
  controls?: WorkflowToStepControlValuesDto;
}

export class BulkTriggerEventDto {
  @ApiProperty({
    isArray: true,
    type: TriggerEventRequestDto,
  })
  events: TriggerEventRequestDto[];
}
