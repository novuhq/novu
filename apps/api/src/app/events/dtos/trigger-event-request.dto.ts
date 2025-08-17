import { ApiExtraModels, ApiHideProperty, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import {
  ProvidersIdEnum,
  SeverityLevelEnum,
  TriggerRecipientSubscriber,
  TriggerRecipientsPayload,
  TriggerRecipientsTypeEnum,
  TriggerTenantContext,
} from '@novu/shared';
import { Type } from 'class-transformer';
import { IsDefined, IsObject, IsOptional, IsString, ValidateIf, ValidateNested } from 'class-validator';
import { SdkApiProperty } from '../../shared/framework/swagger/sdk.decorators';
import { CreateSubscriberRequestDto } from '../../subscribers/dtos';
import { UpdateTenantRequestDto } from '../../tenant/dtos';

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
      additionalProperties: true,
    },
    required: false,
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

export class StepsOverrides {
  @ApiPropertyOptional({
    description: 'Passing the provider id and the provider specific configurations',
    example: {
      sendgrid: {
        templateId: '1234567890',
      },
    },
    type: 'object',
    additionalProperties: {
      type: 'object',
      additionalProperties: true,
    },
  })
  providers?: Record<ProvidersIdEnum, Record<string, unknown>>;

  @ApiPropertyOptional({
    description: 'Override the or remove the layout for this specific step',
    example: 'welcome-email-layout',
    nullable: true,
    type: 'string',
  })
  @IsOptional()
  @IsString()
  layoutId?: string | null;
}

export class EmailChannelOverrides {
  @ApiPropertyOptional({
    description: 'Override or remove the layout for all email steps in the workflow',
    example: 'promotional-layout-2024',
    nullable: true,
    type: 'string',
  })
  @IsOptional()
  @IsString()
  layoutId?: string | null;
}

export class ChannelOverrides {
  @ApiPropertyOptional({
    description: 'Email channel specific overrides',
    type: () => EmailChannelOverrides,
  })
  email?: EmailChannelOverrides;
}

export class TriggerOverrides {
  @ApiPropertyOptional({
    description: 'This could be used to override provider specific configurations or layout at the step level',
    example: {
      'email-step': {
        providers: {
          sendgrid: {
            templateId: '1234567890',
          },
        },
        layoutId: 'step-specific-layout',
      },
    },
    type: 'object',
    additionalProperties: {
      $ref: getSchemaPath(StepsOverrides),
    },
  })
  steps?: Record<string, StepsOverrides>;

  @ApiPropertyOptional({
    description:
      'Channel-specific overrides that apply to all steps of a particular channel type. Step-level overrides take precedence over channel-level overrides.',
    example: {
      email: {
        layoutId: 'promotional-layout-2024',
      },
    },
    type: () => ChannelOverrides,
  })
  channels?: ChannelOverrides;

  @ApiPropertyOptional({
    description: 'Overrides the provider configuration for the entire workflow and all steps',
    example: {
      sendgrid: {
        templateId: '1234567890',
      },
    },
    type: 'object',
    additionalProperties: {
      type: 'object',
      additionalProperties: true,
    },
  })
  providers?: Record<ProvidersIdEnum, Record<string, unknown>>;

  @ApiPropertyOptional({
    description: 'Override the email provider specific configurations for the entire workflow',
    deprecated: true,
    type: 'object',
    additionalProperties: true,
  })
  email?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Override the push provider specific configurations for the entire workflow',
    deprecated: true,
    type: 'object',
    additionalProperties: true,
  })
  push?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Override the sms provider specific configurations for the entire workflow',
    deprecated: true,
    type: 'object',
    additionalProperties: true,
  })
  sms?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Override the chat provider specific configurations for the entire workflow',
    deprecated: true,
    type: 'object',
    additionalProperties: true,
  })
  chat?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Override the layout identifier for the entire workflow',
    deprecated: true,
  })
  layoutIdentifier?: string;

  @ApiHideProperty()
  /* @ApiPropertyOptional({
    description: 'Override the severity of the workflow',
    example: 'high',
    enum: [...Object.values(SeverityLevelEnum)],
    enumName: 'SeverityLevelEnum',
  }) */
  severity?: SeverityLevelEnum;
}

@ApiExtraModels(
  SubscriberPayloadDto,
  TenantPayloadDto,
  TopicPayloadDto,
  StepsOverrides,
  EmailChannelOverrides,
  ChannelOverrides
)
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
    type: TriggerOverrides,
    required: false,
  })
  @IsObject()
  @IsOptional()
  overrides?: TriggerOverrides;

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
    description: `A unique identifier for deduplication. If the same **transactionId** is sent again, 
      the trigger is ignored. Useful to prevent duplicate notifications. The retention period depends on your billing tier.`,
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
