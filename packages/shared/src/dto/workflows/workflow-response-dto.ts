import { IsArray, IsDefined, IsEnum, IsObject, IsString } from 'class-validator';
import { PreferencesResponseDto, StepResponseDto, WorkflowCommonsFields } from './workflow-commons-fields';
import { Base62Id, Slug, WorkflowOriginEnum, WorkflowTypeEnum } from '../../types';
import { WorkflowStatusEnum } from './workflow-status-enum';

export class WorkflowResponseDto extends WorkflowCommonsFields {
  @IsString()
  @IsDefined()
  _id: string;

  @IsString()
  @IsDefined()
  slug: Slug;

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

  @IsEnum(WorkflowStatusEnum)
  @IsDefined()
  status: WorkflowStatusEnum;
}
