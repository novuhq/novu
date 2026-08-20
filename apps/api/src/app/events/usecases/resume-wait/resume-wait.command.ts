import { TriggerRecipientsPayload } from '@novu/shared';
import { IsDefined, IsObject, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class ResumeWaitCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  transactionId: string;

  @IsString()
  @IsOptional()
  stepId?: string;

  @IsDefined()
  to: TriggerRecipientsPayload;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
