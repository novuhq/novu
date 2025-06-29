import { IsEnum, IsOptional, IsString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { StepTypeEnum } from '@novu/shared';
import {
  InAppControlDto,
  EmailControlDto,
  SmsControlDto,
  PushControlDto,
  ChatControlDto,
  DelayControlDto,
  DigestControlDto,
  CustomControlDto,
} from './controls';

// Base DTO for common properties
export class BaseStepConfigDto {
  @ApiProperty({
    description: 'Unique identifier of the step',
    type: 'string',
    required: false,
  })
  @IsString()
  @IsOptional()
  _id?: string;

  @ApiProperty({
    description: 'Name of the step',
  })
  @IsString()
  name: string;
}

// Specific DTOs for each step type
export class InAppStepUpsertDto extends BaseStepConfigDto {
  @ApiProperty({
    enum: StepTypeEnum,
    enumName: 'StepTypeEnum',
    description: 'Type of the step',
  })
  @IsEnum(StepTypeEnum)
  readonly type: StepTypeEnum = 'in_app' as StepTypeEnum;

  @ApiPropertyOptional({
    description: 'Control values for the In-App step.',
    oneOf: [{ $ref: getSchemaPath(InAppControlDto) }, { type: 'object', additionalProperties: true }],
  })
  @IsOptional()
  @IsObject()
  controlValues?: InAppControlDto | Record<string, unknown> | null;
}

export class EmailStepUpsertDto extends BaseStepConfigDto {
  @ApiProperty({
    enum: StepTypeEnum,
    enumName: 'StepTypeEnum',
    default: StepTypeEnum.EMAIL,
    description: 'Type of the step',
  })
  @IsEnum(StepTypeEnum)
  readonly type: StepTypeEnum = 'email' as StepTypeEnum;

  @ApiPropertyOptional({
    description: 'Control values for the Email step.',
    oneOf: [{ $ref: getSchemaPath(EmailControlDto) }, { type: 'object', additionalProperties: true }],
  })
  @IsOptional()
  @IsObject()
  controlValues?: EmailControlDto | Record<string, unknown> | null;
}

export class SmsStepUpsertDto extends BaseStepConfigDto {
  @ApiProperty({
    enum: StepTypeEnum,
    enumName: 'StepTypeEnum',
    default: StepTypeEnum.SMS,
    description: 'Type of the step',
  })
  @IsEnum(StepTypeEnum)
  readonly type: StepTypeEnum = 'sms' as StepTypeEnum;

  @ApiPropertyOptional({
    description: 'Control values for the SMS step.',
    oneOf: [{ $ref: getSchemaPath(SmsControlDto) }, { type: 'object', additionalProperties: true }],
  })
  @IsOptional()
  @IsObject()
  controlValues?: SmsControlDto | Record<string, unknown> | null;
}

export class PushStepUpsertDto extends BaseStepConfigDto {
  @ApiProperty({
    enum: StepTypeEnum,
    enumName: 'StepTypeEnum',
    default: StepTypeEnum.PUSH,
    description: 'Type of the step',
  })
  @IsEnum(StepTypeEnum)
  readonly type: StepTypeEnum = 'push' as StepTypeEnum;

  @ApiPropertyOptional({
    description: 'Control values for the Push step.',
    oneOf: [{ $ref: getSchemaPath(PushControlDto) }, { type: 'object', additionalProperties: true }],
  })
  @IsOptional()
  @IsObject()
  controlValues?: PushControlDto | Record<string, unknown> | null;
}

export class ChatStepUpsertDto extends BaseStepConfigDto {
  @ApiProperty({
    enum: StepTypeEnum,
    enumName: 'StepTypeEnum',
    default: StepTypeEnum.CHAT,
    description: 'Type of the step',
  })
  @IsEnum(StepTypeEnum)
  readonly type: StepTypeEnum = 'chat' as StepTypeEnum;

  @ApiPropertyOptional({
    description: 'Control values for the Chat step.',
    oneOf: [{ $ref: getSchemaPath(ChatControlDto) }, { type: 'object', additionalProperties: true }],
  })
  @IsOptional()
  @IsObject()
  controlValues?: ChatControlDto | Record<string, unknown> | null;
}

export class DelayStepUpsertDto extends BaseStepConfigDto {
  @ApiProperty({
    enum: StepTypeEnum,
    enumName: 'StepTypeEnum',
    default: StepTypeEnum.DELAY,
    description: 'Type of the step',
  })
  @IsEnum(StepTypeEnum)
  readonly type: StepTypeEnum = 'delay' as StepTypeEnum;

  @ApiPropertyOptional({
    description: 'Control values for the Delay step.',
    oneOf: [{ $ref: getSchemaPath(DelayControlDto) }, { type: 'object', additionalProperties: true }],
  })
  @IsOptional()
  @IsObject()
  controlValues?: DelayControlDto | Record<string, unknown> | null;
}

export class DigestStepUpsertDto extends BaseStepConfigDto {
  @ApiProperty({
    enum: StepTypeEnum,
    enumName: 'StepTypeEnum',
    default: StepTypeEnum.DIGEST,
    description: 'Type of the step',
  })
  @IsEnum(StepTypeEnum)
  readonly type: StepTypeEnum = 'digest' as StepTypeEnum;

  @ApiPropertyOptional({
    description: 'Control values for the Digest step.',
    oneOf: [{ $ref: getSchemaPath(DigestControlDto) }, { type: 'object', additionalProperties: true }],
  })
  @IsOptional()
  @IsObject()
  controlValues?: DigestControlDto | Record<string, unknown> | null;
}

export class CustomStepUpsertDto extends BaseStepConfigDto {
  @ApiProperty({
    enum: StepTypeEnum,
    enumName: 'StepTypeEnum',
    default: StepTypeEnum.CUSTOM,
    description: 'Type of the step',
  })
  @IsEnum(StepTypeEnum)
  readonly type: StepTypeEnum = 'custom' as StepTypeEnum;

  @ApiPropertyOptional({
    description: 'Control values for the Custom step.',
    oneOf: [{ $ref: getSchemaPath(CustomControlDto) }, { type: 'object', additionalProperties: true }],
  })
  @IsOptional()
  @IsObject()
  controlValues?: CustomControlDto | Record<string, unknown> | null;
}

/*
 * This export allows using StepUpsertDto as a type for the discriminated union.
 * The actual DTO used will be one of the specific step DTOs at runtime.
 */
export type StepUpsertDto =
  | InAppStepUpsertDto
  | EmailStepUpsertDto
  | SmsStepUpsertDto
  | PushStepUpsertDto
  | ChatStepUpsertDto
  | DelayStepUpsertDto
  | DigestStepUpsertDto
  | CustomStepUpsertDto;
