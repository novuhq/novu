import { EnvironmentWithUserCommand } from '@novu/application-generic';
import type { JobEntity } from '@novu/dal';
import { IsDefined, IsOptional } from 'class-validator';

export class RunJobCommand extends EnvironmentWithUserCommand {
  // Carries a freshly fetched job entity on the hot path; skip the deep copy.
  protected static readonly skipDeepTransform = true;

  @IsDefined()
  jobId: string;

  /**
   * Pre-fetched job (e.g. by the standard worker). When absent, RunJob fetches it by `jobId`.
   */
  @IsOptional()
  job?: JobEntity;
}
