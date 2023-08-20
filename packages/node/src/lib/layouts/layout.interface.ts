import {
  ITemplateVariable,
  LayoutDescription,
  LayoutDto,
  LayoutId,
  LayoutName,
  LayoutIdentifier,
  OrderDirectionEnum,
} from '@novu/shared';

export { LayoutDto, LayoutId };

export interface ILayouts {
  create(data: ILayoutPayload);
  delete(layoutId: LayoutId);
  get(layoutId: LayoutId);
  list(data?: ILayoutPaginationPayload);
  setDefault(layoutId: LayoutId);
  update(layoutId: LayoutId, data: ILayoutUpdatePayload);
}

export interface ILayoutPayload {
  content: string;
  description: LayoutDescription;
  name: LayoutName;
  identifier: LayoutIdentifier;
  variables?: ITemplateVariable[];
  isDefault?: boolean;
}

export interface ILayoutUpdatePayload {
  content?: string;
  description?: LayoutDescription;
  name?: LayoutName;
  identifier?: LayoutIdentifier;
  variables?: ITemplateVariable[];
  isDefault?: boolean;
}

export interface ILayoutPaginationPayload {
  page?: number;
  pageSize?: number;
  orderBy?: OrderDirectionEnum;
  sortBy?: string;
}

export interface ILayoutPaginationResponse {
  data: LayoutDto[];
  page: number;
  pageSize: number;
  totalCount: number;
}
