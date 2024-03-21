import { IsDefined, IsOptional } from 'class-validator';
import { JobEntity } from '@novu/dal';

import { BaseCommand } from '../../commands/base.command';
import { IChimeraDigestResponse } from '../../utils/require-inject';

export class MergeOrCreateDigestCommand extends BaseCommand {
  @IsDefined()
  job: JobEntity;

  @IsOptional()
  filtered?: boolean;

  @IsOptional()
  chimeraData?: IChimeraDigestResponse;
}
