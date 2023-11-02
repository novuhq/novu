import { IsDefined } from 'class-validator';
import { JobEntity } from '@novu/dal';

import { BaseCommand } from '../../commands/base.command';

export class MergeOrCreateDigestCommand extends BaseCommand {
  @IsDefined()
  job: JobEntity;
}
