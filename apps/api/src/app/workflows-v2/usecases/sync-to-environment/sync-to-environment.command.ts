import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { ClientSession } from '@novu/dal';
import { Exclude } from 'class-transformer';
import { IsDefined, IsOptional, IsString } from 'class-validator';

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
