import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { Exclude } from 'class-transformer';
import { IsDefined, IsOptional, IsString } from 'class-validator';
import { ClientSession } from 'mongoose';

export class DeleteWorkflowCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  workflowIdOrInternalId: string;

  /**
   * Exclude session from the command to avoid serializing it in the response
   */
  @IsOptional()
  @Exclude()
  session?: ClientSession | null;
}
