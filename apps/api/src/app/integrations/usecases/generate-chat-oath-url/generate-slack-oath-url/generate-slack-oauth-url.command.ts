import { ResourceKey } from '@novu/shared';
import { IsNotEmpty, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../../shared/commands/project.command';
import { IsResourceKey } from '../../../../shared/validators/resource-key.validator';

export class GenerateSlackOauthUrlCommand extends EnvironmentCommand {
  @IsNotEmpty()
  @IsString()
  readonly integrationIdentifier: string;

  @IsNotEmpty()
  @IsResourceKey()
  readonly resource: ResourceKey;
}
