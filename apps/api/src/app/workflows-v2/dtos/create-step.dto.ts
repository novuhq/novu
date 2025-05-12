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
      { ...inAppControlSchema, title: `Controls for ${StepTypeEnum.IN_APP}` },
      { ...emailControlSchema, title: `Controls for ${StepTypeEnum.EMAIL}` },
      { ...smsControlSchema, title: `Controls for ${StepTypeEnum.SMS}` },
      { ...pushControlSchema, title: `Controls for ${StepTypeEnum.PUSH}` },
      { ...chatControlSchema, title: `Controls for ${StepTypeEnum.CHAT}` },
      { ...delayControlSchema, title: `Controls for ${StepTypeEnum.DELAY}` },
      { ...digestControlSchema, title: `Controls for ${StepTypeEnum.DIGEST}` },
      { ...PERMISSIVE_EMPTY_SCHEMA, title: `Controls for ${StepTypeEnum.CUSTOM}` } as any,
    ],
  })
  @IsOptional()
  controlValues?: Record<string, unknown> | null;
}
