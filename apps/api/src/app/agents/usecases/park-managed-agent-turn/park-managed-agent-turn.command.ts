import type { IManagedAgentJobData } from '@novu/application-generic';
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

  @IsDefined()
  @IsObject()
  jobData: IManagedAgentJobData;
}
