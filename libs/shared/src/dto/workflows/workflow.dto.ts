import { IWorkflowStepMetadata } from '../../entities/step';
import { BuilderFieldType, BuilderGroupValues, FilterParts } from '../../types';
import { MessageTemplateDto } from '../message-template';

export class NotificationStepDto {
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
