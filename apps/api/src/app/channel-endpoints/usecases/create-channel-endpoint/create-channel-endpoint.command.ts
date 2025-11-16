import { BaseCommand, IsValidContextPayload } from '@novu/application-generic';
import { ChannelEndpointByType, ChannelEndpointType, ContextPayload, ENDPOINT_TYPES } from '@novu/shared';
import { IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IsValidChannelEndpoint } from '../../validators/channel-endpoint.validator';

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
  @IsString()
  subscriberId: string;

  @IsOptional()
  @IsValidContextPayload({ maxCount: 5 })
  context?: ContextPayload;

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
    subscriberId: string;
    context?: ContextPayload;
    type: T;
    endpoint: ChannelEndpointByType[T];
  }): CreateChannelEndpointCommand<T> {
    // Call BaseCommand.create with the correct constructor to ensure full inheritance chain validation
    // biome-ignore lint/complexity/noThisInStatic: Required to maintain proper this context for validation
    return BaseCommand.create.call(this, data);
  }
}
