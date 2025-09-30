import { BaseCommand } from '@novu/application-generic';

import { JobEntity } from '@novu/dal';
import { IsDefined } from 'class-validator';

export class MergeOrCreateDigestCommand extends BaseCommand {
  @IsDefined()
  job: JobEntity;
}
