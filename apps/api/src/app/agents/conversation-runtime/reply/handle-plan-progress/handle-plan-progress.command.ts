import type { PlanProgressEvent } from '@novu/framework';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../../shared/commands/project.command';

export class HandlePlanProgressCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @IsObject()
  event: PlanProgressEvent;
}
