import { IsArray, IsDefined, IsEnum, IsObject, IsString } from 'class-validator';
import { PreferencesResponseDto, StepResponseDto, WorkflowCommonsFields } from './workflow-commons-fields';
import { WorkflowOriginEnum } from '../../types';

export class WorkflowResponseDto extends WorkflowCommonsFields {
  @IsString()
  @IsDefined()
  updatedAt: string;

  @IsString()
  @IsDefined()
  createdAt: string;

  @IsArray()
  @IsDefined()
  steps: StepResponseDto[];

  @IsEnum(WorkflowOriginEnum)
  @IsDefined()
  origin: WorkflowOriginEnum;

  @IsObject()
  @IsDefined()
  preferences: PreferencesResponseDto;
}
