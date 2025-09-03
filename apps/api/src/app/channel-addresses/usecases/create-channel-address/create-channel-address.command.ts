import { ADDRESS_TYPES, ChannelAddressByType, ChannelAddressType, ResourceKey } from '@novu/shared';
import { IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IsValidChannelAddress } from '../../../shared/validators/channel-address.validator';
import { IsResourceKey } from '../../../shared/validators/resource-key.validator';

// @ts-expect-error - Override with more specific typing for type safety
export class CreateChannelAddressCommand<T extends ChannelAddressType = ChannelAddressType> extends EnvironmentCommand {
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
  @IsEnum(Object.values(ADDRESS_TYPES))
  type: T;

  @IsDefined()
  @IsValidChannelAddress()
  address: ChannelAddressByType[T];

  static create<T extends ChannelAddressType>(data: {
    organizationId: string;
    environmentId: string;
    identifier?: string;
    integrationIdentifier: string;
    connectionIdentifier?: string;
    resource: ResourceKey;
    type: T;
    address: ChannelAddressByType[T];
  }): CreateChannelAddressCommand<T> {
    const command = new CreateChannelAddressCommand<T>();
    Object.assign(command, data);

    return command;
  }
}
