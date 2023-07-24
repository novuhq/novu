import { IsNumber } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetNotificationTemplatesCommand extends EnvironmentWithUserCommand {
  @IsNumber()
  page: number;

  @IsNumber()
  limit: number;
}
