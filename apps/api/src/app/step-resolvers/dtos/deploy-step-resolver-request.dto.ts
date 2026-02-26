import { ApiProperty } from '@nestjs/swagger';
import { parseSlugId } from '@novu/application-generic';
import { Transform, Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

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
    example: '{"steps":[{"workflowId":"welcome-email","stepId":"welcome"}]}',
  })
  @IsString()
  @IsNotEmpty()
  manifest: string;
}
