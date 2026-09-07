import { BaseCommand } from '@novu/application-generic';
import { ChannelEndpointByType, ChannelEndpointType } from '@novu/shared';
import { IsDefined, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IsValidChannelEndpoint } from '../../validators/channel-endpoint.validator';

// @ts-expect-error - Override with more specific typing for type safety
export class UpdateChannelEndpointCommand<
  T extends ChannelEndpointType = ChannelEndpointType,
> extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  @IsValidChannelEndpoint()
  endpoint: ChannelEndpointByType[T];

  static create<T extends ChannelEndpointType>(data: {
    organizationId: string;
    environmentId: string;
    identifier: string;
    endpoint: ChannelEndpointByType[T];
  }): UpdateChannelEndpointCommand<T> {
    // Call BaseCommand.create with the correct constructor to ensure full inheritance chain validation
    // biome-ignore lint/complexity/noThisInStatic: Required to maintain proper this context for validation
    return BaseCommand.create.call(this, data);
  }
}
