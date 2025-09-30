import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowCriticalityEnum } from '@novu/shared';
import { IsEnum, IsOptional } from 'class-validator';

export class GetSubscriberPreferencesRequestDto {
  @IsEnum(WorkflowCriticalityEnum)
  @IsOptional()
  @ApiPropertyOptional({
    enum: WorkflowCriticalityEnum,
    default: WorkflowCriticalityEnum.NON_CRITICAL,
  })
  criticality?: WorkflowCriticalityEnum = WorkflowCriticalityEnum.NON_CRITICAL;
}
