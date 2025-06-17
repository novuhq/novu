import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { StepTypeEnum } from '@novu/shared';
import { Type } from 'class-transformer';
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

  @ApiPropertyOptional({ type: InAppControlDto, description: 'Control values for the In-App step' })
  @IsOptional()
  @ValidateNested()
  @Type(() => InAppControlDto)
  controlValues?: InAppControlDto | null;
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

  @ApiPropertyOptional({ type: EmailControlDto, description: 'Control values for the Email step' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailControlDto)
  controlValues?: EmailControlDto | null;
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

  @ApiPropertyOptional({ type: SmsControlDto, description: 'Control values for the SMS step' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SmsControlDto)
  controlValues?: SmsControlDto | null;
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

  @ApiPropertyOptional({ type: PushControlDto, description: 'Control values for the Push step' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PushControlDto)
  controlValues?: PushControlDto | null;
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

  @ApiPropertyOptional({ type: ChatControlDto, description: 'Control values for the Chat step' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChatControlDto)
  controlValues?: ChatControlDto | null;
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

  @ApiPropertyOptional({ type: DelayControlDto, description: 'Control values for the Delay step' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DelayControlDto)
  controlValues?: DelayControlDto | null;
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

  @ApiPropertyOptional({ type: DigestControlDto, description: 'Control values for the Digest step' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DigestControlDto)
  controlValues?: DigestControlDto | null;
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

  @ApiPropertyOptional({ type: CustomControlDto, description: 'Control values for the Custom step' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomControlDto)
  controlValues?: CustomControlDto | null;
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
