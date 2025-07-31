import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { ActionTypeEnum, ChannelTypeEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { JSONSchemaDto } from '../../shared/dtos/json-schema.dto';
import { PreviewPayloadDto } from './preview-payload.dto';

export enum TimeUnitEnum {
  SECONDS = 'seconds',
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
}

export enum RedirectTargetEnum {
  SELF = '_self',
  BLANK = '_blank',
  PARENT = '_parent',
  TOP = '_top',
  UNFENCED_TOP = '_unfencedTop',
}

export class RenderOutput {}

export class RedirectDto {
  @ApiProperty({
    description: 'URL to redirect to',
    type: 'string',
  })
  @IsString()
  url: string;

  @ApiPropertyOptional({
    description: 'Target of the redirect',
    enum: [...Object.values(RedirectTargetEnum)],
    enumName: 'RedirectTargetEnum',
  })
  @IsOptional()
  @IsEnum(RedirectTargetEnum)
  target?: RedirectTargetEnum;
}

export class ActionDto {
  @ApiProperty({
    description: 'Label for the action',
    type: 'string',
  })
  @IsString()
  label: string;

  @ApiPropertyOptional({
    description: 'Redirect details for the action',
    type: () => RedirectDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RedirectDto)
  redirect?: RedirectDto;
}

export class ChatRenderOutput extends RenderOutput {
  @ApiProperty({ description: 'Body of the chat message' })
  @IsString()
  body: string;
}

export class SmsRenderOutput extends RenderOutput {
  @ApiProperty({ description: 'Body of the SMS message' })
  @IsString()
  body: string;
}

export class PushRenderOutput extends RenderOutput {
  @ApiProperty({ description: 'Subject of the push notification' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Body of the push notification' })
  @IsString()
  body: string;
}

export class EmailRenderOutput extends RenderOutput {
  @ApiProperty({ description: 'Subject of the email' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Body of the email' })
  @IsString()
  body: string;
}

export class DigestRegularOutput {
  @ApiProperty({ description: 'Amount of time units' })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Time unit',
    enum: [...Object.values(TimeUnitEnum)],
    enumName: 'TimeUnitEnum',
  })
  @IsEnum(TimeUnitEnum)
  unit: TimeUnitEnum;

  @ApiPropertyOptional({ description: 'Optional digest key' })
  @IsOptional()
  @IsString()
  digestKey?: string;

  @ApiPropertyOptional({
    description: 'Look back window configuration',
    type: 'object',
  })
  @IsOptional()
  @ValidateNested()
  lookBackWindow?: {
    amount: number;
    unit: TimeUnitEnum;
  };
}

export class DigestTimedOutput {
  @ApiProperty({ description: 'Cron expression' })
  @IsString()
  cron: string;

  @ApiPropertyOptional({ description: 'Optional digest key' })
  @IsOptional()
  @IsString()
  digestKey?: string;
}

export class DelayRenderOutput extends RenderOutput {
  @ApiProperty({ description: 'Type of delay' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Amount of time units' })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Time unit',
    enum: [...Object.values(TimeUnitEnum)],
    enumName: 'TimeUnitEnum',
  })
  @IsEnum(TimeUnitEnum)
  unit: TimeUnitEnum;
}

export class InAppRenderOutput extends RenderOutput {
  @ApiPropertyOptional({ description: 'Subject of the in-app notification' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ description: 'Body of the in-app notification' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'Avatar for the in-app notification' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({
    description: 'Primary action details',
    type: () => ActionDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ActionDto)
  primaryAction?: ActionDto;

  @ApiPropertyOptional({
    description: 'Secondary action details',
    type: () => ActionDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ActionDto)
  secondaryAction?: ActionDto;

  @ApiPropertyOptional({
    description: 'Additional data',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Redirect details',
    type: () => RedirectDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RedirectDto)
  redirect?: RedirectDto;
}

@ApiExtraModels(
  EmailRenderOutput,
  InAppRenderOutput,
  SmsRenderOutput,
  PushRenderOutput,
  ChatRenderOutput,
  DigestRegularOutput,
  DigestTimedOutput,
  DelayRenderOutput
)
export class GeneratePreviewResponseDto {
  @ApiProperty({
    description: 'Preview payload example',
    type: () => PreviewPayloadDto,
  })
  @ValidateNested()
  @Type(() => PreviewPayloadDto)
  previewPayloadExample: PreviewPayloadDto;

  @ApiPropertyOptional({
    description: 'The payload schema that was used to generate the preview payload example',
    type: 'object',
    nullable: true,
    additionalProperties: true,
  })
  @IsOptional()
  schema?: any | null;

  @ApiProperty({
    description: 'Preview result',
    type: 'object',
    oneOf: [
      {
        type: 'object',
        additionalProperties: true,
      },
      {
        properties: {
          type: { enum: [ChannelTypeEnum.EMAIL] },
          preview: { $ref: getSchemaPath(EmailRenderOutput) },
        },
      },
      {
        properties: {
          type: { enum: [ChannelTypeEnum.EMAIL] },
          preview: { $ref: getSchemaPath(EmailRenderOutput) },
        },
      },
      {
        properties: {
          type: { enum: [ChannelTypeEnum.IN_APP] },
          preview: { $ref: getSchemaPath(InAppRenderOutput) },
        },
      },
      {
        properties: {
          type: { enum: [ChannelTypeEnum.SMS] },
          preview: { $ref: getSchemaPath(SmsRenderOutput) },
        },
      },
      {
        properties: {
          type: { enum: [ChannelTypeEnum.PUSH] },
          preview: { $ref: getSchemaPath(PushRenderOutput) },
        },
      },
      {
        properties: {
          type: { enum: [ChannelTypeEnum.CHAT] },
          preview: { $ref: getSchemaPath(ChatRenderOutput) },
        },
      },
      {
        properties: {
          type: { enum: [ActionTypeEnum.DELAY] },
          preview: { $ref: getSchemaPath(DigestRegularOutput) },
        },
      },
      {
        properties: {
          type: { enum: [ActionTypeEnum.DIGEST] },
          preview: { $ref: getSchemaPath(DigestRegularOutput) },
        },
      },
    ],
  })
  result:
    | {
        type: ChannelTypeEnum.EMAIL;
        preview: EmailRenderOutput;
      }
    | {
        type: ChannelTypeEnum.IN_APP;
        preview: InAppRenderOutput;
      }
    | {
        type: ChannelTypeEnum.SMS;
        preview: SmsRenderOutput;
      }
    | {
        type: ChannelTypeEnum.PUSH;
        preview: PushRenderOutput;
      }
    | {
        type: ChannelTypeEnum.CHAT;
        preview: ChatRenderOutput;
      }
    | {
        type: ActionTypeEnum.DELAY;
        preview: DigestRenderOutput;
      }
    | {
        type: ActionTypeEnum.DIGEST;
        preview: DigestRenderOutput;
      }
    | {
        type:
          | ChannelTypeEnum.EMAIL
          | ChannelTypeEnum.IN_APP
          | ChannelTypeEnum.SMS
          | ChannelTypeEnum.PUSH
          | ChannelTypeEnum.CHAT
          | ActionTypeEnum.DELAY
          | ActionTypeEnum.DIGEST;
        preview: Record<string, unknown>; // Allow empty object
      };
}

export class DigestOutputProcessor {
  static isDigestRegularOutput(output: unknown): output is DigestRegularOutput {
    if (typeof output !== 'object' || output === null) return false;

    const obj = output as { [key: string]: unknown };

    return typeof obj.amount === 'number' && Object.values(TimeUnitEnum).includes(obj.unit as TimeUnitEnum);
  }

  static isDigestTimedOutput(output: unknown): output is DigestTimedOutput {
    if (typeof output !== 'object' || output === null) return false;

    const obj = output as { [key: string]: unknown };

    return typeof obj.cron === 'string' && (typeof obj.digestKey === 'undefined' || typeof obj.digestKey === 'string');
  }
}

export type DigestRenderOutput = DigestRegularOutput | DigestTimedOutput;
type TimeType = 'regular';
