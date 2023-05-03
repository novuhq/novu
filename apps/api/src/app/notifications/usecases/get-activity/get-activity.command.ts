import { IsDefined, IsMongoId } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetActivityCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsMongoId()
  notificationId: string;
}
