import { IWorkflowStepMetadata } from '../../entities/step';
import { BuilderFieldType, BuilderGroupValues, FilterParts } from '../../types';
import { MessageTemplateDto } from '../message-template';
import { UpdateWorkflowDto } from './update-workflow-dto';
import { StepCreateDto, StepUpdateDto } from './workflow-commons-fields';

export class StepVariantDto {
  id?: string;
  _id?: string;
  name?: string;
  uuid?: string;
  _templateId?: string;
  template?: MessageTemplateDto;
  filters?: {
    isNegated?: boolean;
    type?: BuilderFieldType;
    value?: BuilderGroupValues;
    children?: FilterParts[];
  }[];
  active?: boolean;
  shouldStopOnFail?: boolean;
  replyCallback?: {
    active: boolean;
    url?: string;
  };
  metadata?: IWorkflowStepMetadata;
}

export class NotificationStepDto extends StepVariantDto {
  variants?: StepVariantDto[];
}

export type UpsertWorkflowBody = Omit<UpdateWorkflowDto, 'steps'> & {
  steps: UpsertStepBody[];
};

export type UpsertStepBody = StepCreateBody | UpdateStepBody;
export type StepCreateBody = StepCreateDto;
export type UpdateStepBody = StepUpdateDto;

export function isStepCreateBody(step: UpsertStepBody): step is StepCreateDto {
  return step && typeof step === 'object' && !(step as UpdateStepBody)._id;
}

export function isStepUpdateBody(step: UpsertStepBody): step is UpdateStepBody {
  return step && typeof step === 'object' && !!(step as UpdateStepBody)._id;
}
