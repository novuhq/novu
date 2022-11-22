import { IsOptional, IsNotEmpty } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class UpdateMessageCommand extends EnvironmentCommand {
  @IsNotEmpty()
  query: any;

  @IsNotEmpty()
  updateBody: any;

  @IsOptional()
  subscriberId?: string;

  @IsOptional()
  invalidate?: boolean;
}
