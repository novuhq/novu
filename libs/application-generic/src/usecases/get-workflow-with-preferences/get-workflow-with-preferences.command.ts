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

  @Exclude()
  session?: ClientSession | null;
}
