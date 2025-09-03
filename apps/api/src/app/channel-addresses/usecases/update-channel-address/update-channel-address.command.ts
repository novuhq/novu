import { ChannelAddressByType, ChannelAddressType } from '@novu/shared';
import { IsDefined, IsObject, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

// @ts-expect-error - Override with more specific typing for type safety
export class UpdateChannelAddressCommand<T extends ChannelAddressType = ChannelAddressType> extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  @IsObject()
  address: ChannelAddressByType[T];

  static create<T extends ChannelAddressType>(data: {
    organizationId: string;
    environmentId: string;
    identifier: string;
    address: ChannelAddressByType[T];
  }): UpdateChannelAddressCommand<T> {
    const command = new UpdateChannelAddressCommand<T>();
    Object.assign(command, data);

    return command;
  }
}
