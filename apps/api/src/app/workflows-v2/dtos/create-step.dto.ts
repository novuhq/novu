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
  @ApiProperty({ enum: [StepTypeEnum.IN_APP], description: 'Type of the step' })
  @IsEnum(StepTypeEnum)
  readonly type: StepTypeEnum.IN_APP = StepTypeEnum.IN_APP;

  @ApiPropertyOptional({ type: InAppControlDto, description: 'Control values for the In-App step' })
  @IsOptional()
  @ValidateNested()
  @Type(() => InAppControlDto)
  controlValues?: InAppControlDto | null;
}

export class EmailStepUpsertDto extends BaseStepConfigDto {
  @ApiProperty({ enum: [StepTypeEnum.EMAIL], description: 'Type of the step' })
  @IsEnum(StepTypeEnum)
  readonly type: StepTypeEnum.EMAIL = StepTypeEnum.EMAIL;

  @ApiPropertyOptional({ type: EmailControlDto, description: 'Control values for the Email step' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailControlDto)
  controlValues?: EmailControlDto | null;
}

export class SmsStepUpsertDto extends BaseStepConfigDto {
  @ApiProperty({ enum: [StepTypeEnum.SMS], description: 'Type of the step' })
  @IsEnum(StepTypeEnum)
  readonly type: StepTypeEnum.SMS = StepTypeEnum.SMS;

  @ApiPropertyOptional({ type: SmsControlDto, description: 'Control values for the SMS step' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SmsControlDto)
  controlValues?: SmsControlDto | null;
}

export class PushStepUpsertDto extends BaseStepConfigDto {
  @ApiProperty({ enum: [StepTypeEnum.PUSH], description: 'Type of the step' })
  @IsEnum(StepTypeEnum)
  readonly type: StepTypeEnum.PUSH = StepTypeEnum.PUSH;

  @ApiPropertyOptional({ type: PushControlDto, description: 'Control values for the Push step' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PushControlDto)
  controlValues?: PushControlDto | null;
}

export class ChatStepUpsertDto extends BaseStepConfigDto {
  @ApiProperty({ enum: [StepTypeEnum.CHAT], description: 'Type of the step' })
  @IsEnum(StepTypeEnum)
  readonly type: StepTypeEnum.CHAT = StepTypeEnum.CHAT;

  @ApiPropertyOptional({ type: ChatControlDto, description: 'Control values for the Chat step' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChatControlDto)
  controlValues?: ChatControlDto | null;
}

export class DelayStepUpsertDto extends BaseStepConfigDto {
  @ApiProperty({ enum: [StepTypeEnum.DELAY], description: 'Type of the step' })
  @IsEnum(StepTypeEnum)
  readonly type: StepTypeEnum.DELAY = StepTypeEnum.DELAY;

  @ApiPropertyOptional({ type: DelayControlDto, description: 'Control values for the Delay step' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DelayControlDto)
  controlValues?: DelayControlDto | null;
}

export class DigestStepUpsertDto extends BaseStepConfigDto {
  @ApiProperty({ enum: [StepTypeEnum.DIGEST], description: 'Type of the step' })
  @IsEnum(StepTypeEnum)
  readonly type: StepTypeEnum.DIGEST = StepTypeEnum.DIGEST;

  @ApiPropertyOptional({ type: DigestControlDto, description: 'Control values for the Digest step' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DigestControlDto)
  controlValues?: DigestControlDto | null;
}

export class CustomStepUpsertDto extends BaseStepConfigDto {
  @ApiProperty({ enum: [StepTypeEnum.CUSTOM], description: 'Type of the step' })
  @IsEnum(StepTypeEnum)
  readonly type: StepTypeEnum.CUSTOM = StepTypeEnum.CUSTOM;

  @ApiPropertyOptional({ type: CustomControlDto, description: 'Control values for the Custom step' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomControlDto)
  controlValues?: CustomControlDto | null;
}

/*
 * Removed the StepUpsertDto class that previously handled discrimination.
 * The StepUpsertDto type below is the union of all specific step DTOs.
 */

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
