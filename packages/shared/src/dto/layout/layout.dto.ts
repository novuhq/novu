import { ChannelTypeEnum, IEmailBlock, ITemplateVariable, ResourceOriginEnum, ResourceTypeEnum } from '../../types';
import { RuntimeIssueDto } from '../workflows/workflow.dto';

export class LayoutDto {
  _id?: string;
  _organizationId: string;
  _environmentId: string;
  _creatorId: string;
  _parentId?: string;
  name: string;
  identifier: string;
  description?: string;
  channel: ChannelTypeEnum;
  content: IEmailBlock[];
  contentType: string;
  variables?: ITemplateVariable[];
  isDefault: boolean;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export enum LayoutCreationSourceEnum {
  DASHBOARD = 'dashboard',
}

export type CreateLayoutDto = {
  layoutId: string;
  name: string;
  __source: LayoutCreationSourceEnum;
};

export type EmailControlsDto = {
  content: string;
  editorType: 'html' | 'block';
};

export type LayoutControlValuesDto = {
  email?: EmailControlsDto;
};

export type UpdateLayoutDto = {
  name: string;
  controlValues: LayoutControlValuesDto;
};

export type LayoutCreateAndUpdateKeys = keyof CreateLayoutDto | keyof UpdateLayoutDto;

export type LayoutResponseDto = {
  _id: string;
  layoutId: string;
  name: string;
  isDefault: boolean;
  updatedAt: string;
  createdAt: string;
  origin: ResourceOriginEnum;
  type: ResourceTypeEnum;
  issues?: Record<LayoutCreateAndUpdateKeys, RuntimeIssueDto>;
};

export type ListLayoutsResponse = {
  layouts: LayoutResponseDto[];
  totalCount: number;
};
