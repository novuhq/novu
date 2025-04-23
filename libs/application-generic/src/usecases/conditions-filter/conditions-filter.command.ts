import { IsDefined } from 'class-validator';

import { JobEntity, NotificationStepEntity, StepFilter } from '@novu/dal';

import { EnvironmentWithUserCommand } from '../../commands';
import { IFilterVariables } from '../../utils';

export class ConditionsFilterCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  filters: StepFilter[];

  job?: JobEntity;

  step?: NotificationStepEntity;

  variables?: IFilterVariables;
}
