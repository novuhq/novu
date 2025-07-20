import { IsString, IsDefined } from 'class-validator';
import { EnvironmentWithUserCommand } from '@novu/application-generic';

export class DeleteLayoutCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  layoutIdOrInternalId: string;
}
