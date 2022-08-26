import { IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetNotificationTemplatesCommand extends EnvironmentWithUserCommand {
  @IsNumber()
  @IsOptional()
  page?: number;

  @IsBoolean()
  @IsOptional()
  usePagination?: boolean;
}
