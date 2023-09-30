import { EnvironmentCommand } from '../../commands';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetTenantCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  identifier: string;
}
