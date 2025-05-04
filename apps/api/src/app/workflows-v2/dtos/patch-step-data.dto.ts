import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class PatchStepDataDto {
  @ApiPropertyOptional({
    description: 'New name for the step',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Control values for the step',
    type: 'object',
    nullable: true,
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  controlValues?: Record<string, unknown> | null;
}
