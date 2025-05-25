import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class WorkflowCommonsFields {
  @ApiProperty({ description: 'Name of the workflow' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description of the workflow', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Tags associated with the workflow',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Whether the workflow is active',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
