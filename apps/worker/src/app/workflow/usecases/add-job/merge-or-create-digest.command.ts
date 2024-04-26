import { IsDefined, IsOptional } from 'class-validator';

import { JobEntity } from '@novu/dal';
import { BaseCommand, IChimeraDigestResponse } from '@novu/application-generic';

export class MergeOrCreateDigestCommand extends BaseCommand {
  @IsDefined()
  job: JobEntity;

  @IsOptional()
  filtered?: boolean;

  @IsOptional()
  chimeraData?: IChimeraDigestResponse;
}
