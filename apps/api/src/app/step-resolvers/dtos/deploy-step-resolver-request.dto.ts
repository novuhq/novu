import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { parseSlugId } from '@novu/application-generic';
import { StepTypeEnum } from '@novu/shared';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class DeployStepResolverManifestStepDto {
  @ApiProperty({
    description: 'Workflow identifier (trigger identifier or internal workflow id)',
    example: 'welcome-email',
  })
  @Transform(({ value }) => parseSlugId(value))
  @IsString()
  @IsNotEmpty()
  workflowId: string;

  @ApiProperty({
    description: 'Step identifier from workflow definition',
    example: 'welcome-email-step',
  })
  @IsString()
  @IsNotEmpty()
  stepId: string;

  @ApiProperty({
    description: 'Channel step type',
    enum: StepTypeEnum,
    example: StepTypeEnum.EMAIL,
  })
  @IsEnum(StepTypeEnum)
  @IsNotEmpty()
  stepType: StepTypeEnum;

  @ApiPropertyOptional({
    description: 'JSON Schema describing the control inputs for this step',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  controlSchema?: Record<string, unknown>;
}

export class DeployStepResolverManifestDto {
  @ApiProperty({
    description: 'Selected steps included in this publish',
    type: [DeployStepResolverManifestStepDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DeployStepResolverManifestStepDto)
  steps: DeployStepResolverManifestStepDto[];
}

export class DeployStepResolverRequestDto {
  @ApiProperty({
    description: 'JSON-serialized step resolver manifest',
    example: '{"steps":[{"workflowId":"welcome-email","stepId":"welcome","stepType":"email"}]}',
  })
  @IsString()
  @IsNotEmpty()
  manifest: string;
}
