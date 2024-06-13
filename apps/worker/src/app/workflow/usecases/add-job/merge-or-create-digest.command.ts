import { IsDefined, IsOptional } from 'class-validator';

import { JobEntity } from '@novu/dal';
import { BaseCommand, IDigestResponse } from '@novu/application-generic';

export class MergeOrCreateDigestCommand extends BaseCommand {
  @IsDefined()
  job: JobEntity;

  @IsOptional()
  filtered?: boolean;

  @IsOptional()
  chimeraData?: IDigestResponse;
}
