import { IsNotEmpty, IsObject, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../../shared/commands/project.command';
import type { PlanProgressEvent } from '../../egress/plan-phase';

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
