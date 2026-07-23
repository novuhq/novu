import { ClientSession } from '@novu/dal';
import { Exclude } from 'class-transformer';
import { IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../commands';

export class GetWorkflowWithPreferencesCommand extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  workflowIdOrInternalId: string;

  @IsOptional()
  @IsString()
  userId?: string;

  /**
   * When true, the workflow preferences are read directly from the database,
   * bypassing the per-instance LRU cache. Set for interactive dashboard (JWT)
   * reads so a workflow's preferences reflect the latest write immediately.
   */
  @IsOptional()
  skipPreferencesCache?: boolean;

  @Exclude()
  session?: ClientSession | null;
}
