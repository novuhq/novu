import { SoftDeleteModel } from 'mongoose-delete';
import { ControlVariables, ControlVariablesModel } from './controlVariables.schema';
import { ControlVariablesEntity } from './controlVariables.entity';
import { BaseRepository } from '../base-repository';
import { EnforceEnvOrOrgIds } from '../../types';

export class ControlVariablesRepository extends BaseRepository<
  ControlVariablesModel,
  ControlVariablesEntity,
  EnforceEnvOrOrgIds
> {
  private controlVariables: SoftDeleteModel;

  constructor() {
    super(ControlVariables, ControlVariablesEntity);
    this.controlVariables = ControlVariables;
  }
}
