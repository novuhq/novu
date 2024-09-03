import { IsNotEmpty, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../commands';

export class GetTenantCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  identifier: string;
}
