import { IsArray } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { TriggerEventRequestDto } from '../../dtos';

export class ProcessBulkTriggerCommand extends EnvironmentWithUserCommand {
  @IsArray()
  events: TriggerEventRequestDto[];
}
