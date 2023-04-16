import { IsDefined } from 'class-validator';
import { JobEntity } from '@novu/dal';

import { BaseCommand } from '../../commands/base.command';

export class AddDigestJobCommand extends BaseCommand {
  @IsDefined()
  job: JobEntity;
}
