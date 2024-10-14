import { SoftDeleteModel } from 'mongoose-delete';
import { ControlValuesLevelEnum } from '@novu/shared';
import { ControlValuesModel, ControlValues } from './control-values.schema';
import { ControlValuesEntity } from './control-values.entity';
import { BaseRepository } from '../base-repository';
import { EnforceEnvOrOrgIds } from '../../types';

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface DeleteManyValuesQuery {
  _environmentId: string;
  _organizationId: string;
  _workflowId: string;
  _stepId?: string;
  level?: ControlValuesLevelEnum;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface FindControlValuesQuery {
  _environmentId: string;
  _organizationId: string;
  _workflowId: string;
  _stepId: string;
  level?: ControlValuesLevelEnum;
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
