import { IsDefined, IsOptional } from 'class-validator';

import { EnvironmentCommand } from '../../../shared/commands';

export class SetJobAsCommand extends EnvironmentCommand {
  @IsDefined()
  _jobId: string;
}

export class SetJobAsFailedCommand extends SetJobAsCommand {
  @IsOptional()
  error: Error;
}
