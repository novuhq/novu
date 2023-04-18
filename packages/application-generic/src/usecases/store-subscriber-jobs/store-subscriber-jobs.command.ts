import { IsDefined } from 'class-validator';
// TODO: Implement a DTO or shared entity
import { JobEntity } from '@novu/dal';

import { EnvironmentCommand } from '../../commands';

export class StoreSubscriberJobsCommand extends EnvironmentCommand {
  @IsDefined()
  jobs: Omit<JobEntity, '_id' | 'createdAt' | 'updatedAt'>[];
}
