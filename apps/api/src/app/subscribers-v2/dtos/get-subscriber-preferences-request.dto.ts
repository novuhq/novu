import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowCriticalityEnum } from '@novu/shared';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class GetSubscriberPreferencesRequestDto {
  @IsEnum(WorkflowCriticalityEnum)
  @IsOptional()
  @ApiPropertyOptional({
    enum: WorkflowCriticalityEnum,
    default: WorkflowCriticalityEnum.NON_CRITICAL,
  })
  criticality?: WorkflowCriticalityEnum = WorkflowCriticalityEnum.NON_CRITICAL;

  @IsOptional()
  @Transform(({ value }) => {
    // No parameter = no filter
    if (value === undefined) return undefined;

    // Empty string = filter for records with no (default) context
    if (value === '') return [];

    // Normalize to array and remove empty strings
    const array = Array.isArray(value) ? value : [value];
    return array.filter((v) => v !== '');
  })
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({
    description: 'Context keys for filtering preferences (e.g., ["tenant:acme"])',
    type: [String],
    example: ['tenant:acme'],
  })
  contextKeys?: string[];
}
