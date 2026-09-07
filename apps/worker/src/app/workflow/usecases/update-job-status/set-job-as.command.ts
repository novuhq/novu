import { EnvironmentLevelWithUserCommand } from '@novu/application-generic';
import { IsDefined, IsOptional } from 'class-validator';

export class SetJobAsCommand extends EnvironmentLevelWithUserCommand {
  @IsDefined()
  jobId: string;
}

export class SetJobAsFailedCommand extends SetJobAsCommand {
  @IsDefined()
  organizationId: string;

  @IsOptional()
  isLastJobFailed?: boolean;
}
