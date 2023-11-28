import { IsDefined } from 'class-validator';

import { NotificationStepEntity, TenantEntity, JobEntity } from '@novu/dal';

import { EnvironmentWithUserCommand } from '../../commands';
import { IFilterVariables } from '../../utils/filter-processing-details';

export class SelectVariantCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  filterData: IFilterVariables;

  @IsDefined()
  step: NotificationStepEntity;

  @IsDefined()
  job: JobEntity;
}
