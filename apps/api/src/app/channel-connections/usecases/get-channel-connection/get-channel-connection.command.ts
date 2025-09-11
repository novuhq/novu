import { ResourceKey } from '@novu/shared';
import { IsDefined, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IsResourceKey } from '../../../shared/validators/resource-key.validator';

export class GetChannelConnectionCommand extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  @IsResourceKey()
  resource: ResourceKey;

  @IsDefined()
  @IsString()
  integrationIdentifier: string;
}
