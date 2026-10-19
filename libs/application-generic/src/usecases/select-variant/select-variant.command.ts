import { JobEntity, NotificationStepEntity, TenantEntity } from '@novu/dal';
import { IsDefined } from 'class-validator';

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
