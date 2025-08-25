import { ChannelEndpointRouting } from '@novu/shared';
import { IsDefined, IsObject, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class UpdateChannelEndpointCommand extends EnvironmentWithSubscriber {
  @IsString()
  @IsDefined()
  identifier: string;

  @IsString()
  @IsDefined()
  endpoint: string;

  @IsOptional()
  @IsObject()
  routing?: ChannelEndpointRouting;
}
