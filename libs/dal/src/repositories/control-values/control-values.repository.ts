import { ControlValuesLevelEnum } from '@novu/shared';
import { ClientSession } from 'mongoose';
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

  async deleteMany(
    query: DeleteManyValuesQuery,
    options: {
      session?: ClientSession | null;
    } = {}
  ) {
    return await super.delete(query, options);
  }
}
