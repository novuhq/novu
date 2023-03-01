import { IsDefined, IsString, IsOptional } from 'class-validator';
// TODO: Implement a DTO or shared entity
import { JobEntity } from '@novu/dal';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class StoreSubscriberJobsCommand extends EnvironmentCommand {
  @IsDefined()
  jobs: Omit<JobEntity, '_id'>[];
}
