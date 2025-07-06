import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsDefined, IsString, IsOptional } from 'class-validator';
import { Exclude } from 'class-transformer';
import { ClientSession } from '@novu/dal';

export class SyncToEnvironmentCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  @IsDefined()
  workflowIdOrInternalId: string;

  @IsString()
  @IsDefined()
  targetEnvironmentId: string;

  /**
   * Exclude session from the command to avoid serializing it in the response
   */
  @IsOptional()
  @Exclude()
  session?: ClientSession | null;
}
