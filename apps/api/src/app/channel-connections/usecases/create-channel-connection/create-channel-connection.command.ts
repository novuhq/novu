import { ResourceKey } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsDefined, IsOptional, IsString, ValidateNested } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IsResourceKey } from '../../../shared/validators/resource-key.validator';
import { AuthDto, WorkspaceDto } from '../../dtos/shared.dto';

export class CreateChannelConnectionCommand extends EnvironmentCommand {
  @IsOptional()
  @IsString()
  identifier?: string;

  @IsDefined()
  @IsString()
  integrationIdentifier: string;

  @IsDefined()
  @IsResourceKey()
  resource: ResourceKey;

  @IsDefined()
  @ValidateNested()
  @Type(() => WorkspaceDto)
  workspace: WorkspaceDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => AuthDto)
  auth: AuthDto;
}
