import { EnvironmentCommand } from '@novu/application-generic';
// TODO: Implement a DTO or shared entity
import { JobEntity } from '@novu/dal';
import { IsDefined } from 'class-validator';

export class StoreSubscriberJobsCommand extends EnvironmentCommand {
  @IsDefined()
  jobs: Omit<JobEntity, '_id' | 'createdAt' | 'updatedAt'>[];
}
