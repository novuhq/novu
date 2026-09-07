import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserObjectCommand } from '../../commands';

export class GetWorkflowCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  @IsDefined()
  workflowIdOrInternalId: string;

  @IsString()
  @IsOptional()
  environmentId?: string;

  /**
   * When true, the read bypasses the WORKFLOW_PREFERENCES LRU cache so it reflects
   * the latest write. Callers that need read-after-write consistency (e.g. interactive
   * dashboard reads) must opt in explicitly. Defaults to cached reads.
   */
  @IsBoolean()
  @IsOptional()
  skipPreferencesCache?: boolean;
}
