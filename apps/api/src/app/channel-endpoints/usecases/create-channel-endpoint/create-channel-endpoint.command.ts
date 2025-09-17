import { BaseCommand } from '@novu/application-generic';
import { ChannelEndpointByType, ChannelEndpointType, ENDPOINT_TYPES, ResourceKey } from '@novu/shared';
import { IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IsValidChannelEndpoint } from '../../validators/channel-endpoint.validator';
import { IsResourceKey } from '../../../shared/validators/resource-key.validator';

// @ts-expect-error - Override with more specific typing for type safety
export class CreateChannelEndpointCommand<
  T extends ChannelEndpointType = ChannelEndpointType,
> extends EnvironmentCommand {
  @IsOptional()
  @IsString()
  identifier?: string;

  @IsDefined()
  @IsString()
  integrationIdentifier: string;

  @IsOptional()
  @IsString()
  connectionIdentifier?: string;

  @IsDefined()
  @IsResourceKey()
  resource: ResourceKey;

  @IsDefined()
  @IsEnum(Object.values(ENDPOINT_TYPES))
  type: T;

  @IsDefined()
  @IsValidChannelEndpoint()
  endpoint: ChannelEndpointByType[T];

  static create<T extends ChannelEndpointType>(data: {
    organizationId: string;
    environmentId: string;
    identifier?: string;
    integrationIdentifier: string;
    connectionIdentifier?: string;
    resource: ResourceKey;
    type: T;
    endpoint: ChannelEndpointByType[T];
  }): CreateChannelEndpointCommand<T> {
    // Call BaseCommand.create with the correct constructor to ensure full inheritance chain validation
    // biome-ignore lint/complexity/noThisInStatic: Required to maintain proper this context for validation
    return BaseCommand.create.call(this, data);
  }
}
