import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsNotEmpty, IsString } from 'class-validator';

export class DisconnectStepResolverCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  @IsNotEmpty()
  stepInternalId: string;
}
