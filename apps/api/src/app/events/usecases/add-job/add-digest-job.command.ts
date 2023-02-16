import { IsDefined } from 'class-validator';
import { JobEntity } from '@novu/dal';

import { BaseCommand } from '../../../shared/commands/project.command';

export class AddDigestJobCommand extends BaseCommand {
  @IsDefined()
  job: JobEntity;
}
