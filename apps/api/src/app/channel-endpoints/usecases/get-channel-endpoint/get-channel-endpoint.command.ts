import { IsArray, IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetChannelEndpointCommand extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  @IsOptional()
  @IsString()
  subscriberId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contextKeys?: string[];
}
