import { IsDefined, IsObject } from 'class-validator';
import { BaseCommand } from '../../commands/base.command';
import type { IManagedAgentJobData } from '../../dtos/managed-agent-job.dto';

export class EnqueueManagedAgentJobCommand extends BaseCommand {
  @IsDefined()
  @IsObject()
  jobData: IManagedAgentJobData;
}
