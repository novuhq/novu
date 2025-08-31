import { ChannelEndpointRouting } from '@novu/shared';
import { IsDefined, IsObject, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class CreateChannelEndpointCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  @IsString()
  identifier?: string;

  @IsString()
  @IsDefined()
  integrationIdentifier: string;

  @IsString()
  @IsDefined()
  endpoint: string;

  @IsOptional()
  @IsObject()
  routing?: ChannelEndpointRouting;
}
