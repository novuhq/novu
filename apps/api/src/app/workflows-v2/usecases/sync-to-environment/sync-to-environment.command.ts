import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsDefined, IsString, IsOptional } from 'class-validator';
import { ClientSession } from '@novu/dal';

export class SyncToEnvironmentCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  @IsDefined()
  workflowIdOrInternalId: string;

  @IsString()
  @IsDefined()
  targetEnvironmentId: string;

  @IsOptional()
  session?: ClientSession;
}
