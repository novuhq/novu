import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsDefined, IsString } from 'class-validator';

export class SyncToEnvironmentCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  @IsDefined()
  workflowIdOrInternalId: string;

  @IsString()
  @IsDefined()
  targetEnvironmentId: string;
}
