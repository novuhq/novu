import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JSONSchemaDto, StepTypeEnum } from '@novu/shared';
import {
  inAppControlSchema,
  emailControlSchema,
  smsControlSchema,
  pushControlSchema,
  chatControlSchema,
  delayControlSchema,
  digestControlSchema,
} from '@novu/application-generic';
import { PERMISSIVE_EMPTY_SCHEMA } from '../shared/step-type-to-control.mapper';

export class StepUpsertDto {
  @ApiProperty({
    description: 'Name of the step',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Unique identifier of the step',
    type: 'string',
    required: false,
  })
  @IsString()
  @IsOptional()
  _id?: string;

  @ApiProperty({
    description: 'Type of the step',
    enum: [...Object.values(StepTypeEnum)],
    enumName: 'StepTypeEnum',
  })
  @IsEnum(StepTypeEnum)
  type: StepTypeEnum;

  @ApiPropertyOptional({
    description: 'Control values for the step, structure depends on the step type.',
    nullable: true,
    oneOf: [
      {
        title: `Controls for ${StepTypeEnum.IN_APP}`,
        type: inAppControlSchema.type as any,
        properties: inAppControlSchema.properties as any,
        required: inAppControlSchema.required as any,
        additionalProperties: inAppControlSchema.additionalProperties as any,
      },
      {
        title: `Controls for ${StepTypeEnum.EMAIL}`,
        type: emailControlSchema.type as any,
        properties: emailControlSchema.properties as any,
        required: emailControlSchema.required as any,
        additionalProperties: emailControlSchema.additionalProperties as any,
      },
      {
        title: `Controls for ${StepTypeEnum.SMS}`,
        type: smsControlSchema.type as any,
        properties: smsControlSchema.properties as any,
        required: smsControlSchema.required as any,
        additionalProperties: smsControlSchema.additionalProperties as any,
      },
      {
        title: `Controls for ${StepTypeEnum.PUSH}`,
        type: pushControlSchema.type as any,
        properties: pushControlSchema.properties as any,
        required: pushControlSchema.required as any,
        additionalProperties: pushControlSchema.additionalProperties as any,
      },
      {
        title: `Controls for ${StepTypeEnum.CHAT}`,
        type: chatControlSchema.type as any,
        properties: chatControlSchema.properties as any,
        required: chatControlSchema.required as any,
        additionalProperties: chatControlSchema.additionalProperties as any,
      },
      {
        title: `Controls for ${StepTypeEnum.DELAY}`,
        type: delayControlSchema.type as any,
        properties: delayControlSchema.properties as any,
        required: delayControlSchema.required as any,
        additionalProperties: delayControlSchema.additionalProperties as any,
      },
      {
        title: `Controls for ${StepTypeEnum.DIGEST}`,
        type: digestControlSchema.type as any,
        properties: digestControlSchema.properties as any,
        required: digestControlSchema.required as any,
        additionalProperties: digestControlSchema.additionalProperties as any,
      },
      {
        title: `Controls for ${StepTypeEnum.CUSTOM}`,
        type: PERMISSIVE_EMPTY_SCHEMA.type as any,
        properties: PERMISSIVE_EMPTY_SCHEMA.properties as any,
        additionalProperties: PERMISSIVE_EMPTY_SCHEMA.additionalProperties as any,
      },
    ],
  })
  @IsOptional()
  controlValues?: Record<string, unknown> | null;
}
