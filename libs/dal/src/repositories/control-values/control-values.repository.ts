import { ControlValuesLevelEnum } from '@novu/shared';
import { SoftDeleteModel } from 'mongoose-delete';
import { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepository } from '../base-repository';
import { ControlValuesEntity } from './control-values.entity';
import { ControlValues, ControlValuesModel } from './control-values.schema';

export interface DeleteManyValuesQuery {
  _environmentId: string;
  _organizationId: string;
  _workflowId?: string;
  _stepId?: string;
  _layoutId?: string;
  level?: ControlValuesLevelEnum;
}

export interface FindControlValuesQuery {
  _environmentId: string;
  _organizationId: string;
  _workflowId?: string;
  _stepId?: string;
  _layoutId?: string;
  level?: ControlValuesLevelEnum;
  [key: string]: unknown;
}

export class ControlValuesRepository extends BaseRepository<
  ControlValuesModel,
  ControlValuesEntity,
  EnforceEnvOrOrgIds
> {
  private controlValues: SoftDeleteModel;

  constructor() {
    super(ControlValues, ControlValuesEntity);
    this.controlValues = ControlValues;
  }

  async deleteMany(query: DeleteManyValuesQuery) {
    return await super.delete(query);
  }

  async findMany(query: FindControlValuesQuery): Promise<ControlValuesEntity[]> {
    return await super.find(query);
  }

  async findFirst(query: FindControlValuesQuery): Promise<ControlValuesEntity | null> {
    return await this.findOne(query);
  }
}
