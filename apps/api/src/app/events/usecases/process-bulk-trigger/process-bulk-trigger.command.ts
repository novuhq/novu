import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { TriggerEventRequestDto } from '../../dtos';
import { IsArray } from 'class-validator';

export class ProcessBulkTriggerCommand extends EnvironmentWithUserCommand {
  @IsArray()
  events: TriggerEventRequestDto[];
}
