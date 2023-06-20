import { EnvironmentCommand } from '@novu/application-generic';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class GetTenantCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  id: string;
}
