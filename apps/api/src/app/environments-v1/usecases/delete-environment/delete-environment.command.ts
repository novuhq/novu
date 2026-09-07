import { IsBoolean, IsMongoId, IsOptional } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class DeleteEnvironmentCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsBoolean()
  restrictToUserEnvironment?: boolean;

  @IsOptional()
  @IsMongoId()
  userEnvironmentId?: string;
}
