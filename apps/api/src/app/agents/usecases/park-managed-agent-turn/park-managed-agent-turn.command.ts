import { IsDefined, IsNotEmpty, IsObject, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class ParkManagedAgentTurnCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  mcpId: string;

  /** External subscriberId — converted to Mongo `Subscriber._id`. */
  @IsString()
  @IsNotEmpty()
  subscriberId: string;

  /**
   * Opaque per-turn replay envelope. The shape is determined by the runtime
   * that produced the parked turn — today this is the CF durable-session
   * managed-agent runtime, so the blob carries whatever it needs to re-dispatch
   * the user message after the OAuth callback completes. Kept generic at the
   * persistence boundary so adding new runtimes doesn't require a DAL change.
   */
  @IsDefined()
  @IsObject()
  jobData: Record<string, unknown>;
}
