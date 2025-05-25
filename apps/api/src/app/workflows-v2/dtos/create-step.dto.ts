import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StepTypeEnum } from '@novu/shared';

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
    description: 'Control values for the step',
    type: 'object',
    nullable: true,
    additionalProperties: true,
  })
  @IsOptional()
  controlValues?: Record<string, unknown> | null;
}
