import { EnvironmentCommand } from '@novu/application-generic';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteTenantCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  identifier: string;
}
