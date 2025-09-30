import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Slug, StepTypeEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { StepIssuesDto } from './step-issues.dto';

export class StepListResponseDto {
  @ApiProperty({ description: 'Slug of the step', type: 'string' })
  @IsString()
  slug: Slug;

  @ApiProperty({
    description: 'Type of the step',
    enum: [...Object.values(StepTypeEnum)],
    enumName: 'StepTypeEnum',
  })
  @IsEnum(StepTypeEnum)
  type: StepTypeEnum;

  @ApiPropertyOptional({
    description: 'Issues associated with the step',
    type: () => StepIssuesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StepIssuesDto)
  issues?: StepIssuesDto;
}
