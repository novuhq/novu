import { EnvironmentCommand } from '@novu/application-generic';
import { ClientSession } from '@novu/dal';
import { Exclude } from 'class-transformer';
import { IsDefined, IsOptional, IsString } from 'class-validator';

export class GetWorkflowWithPreferencesCommand extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  workflowIdOrInternalId: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @Exclude()
  session?: ClientSession | null;
}
