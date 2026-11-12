import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class CancelConversationTurnCommand extends EnvironmentCommand {
  /** The conversation's `_id`; the caller has already checked the actor may stop it. */
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  /** The actor's session context keys, resolved into the `onAbort` turn's `ctx.context` as web chat does inbound. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contextKeys?: string[];
}
