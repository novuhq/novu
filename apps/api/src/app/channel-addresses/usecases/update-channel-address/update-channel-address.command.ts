import { BaseCommand } from '@novu/application-generic';
import { ChannelAddressByType, ChannelAddressType } from '@novu/shared';
import { IsDefined, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IsValidChannelAddress } from '../../../shared/validators/channel-address.validator';

// @ts-expect-error - Override with more specific typing for type safety
export class UpdateChannelAddressCommand<T extends ChannelAddressType = ChannelAddressType> extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  @IsValidChannelAddress()
  address: ChannelAddressByType[T];

  static create<T extends ChannelAddressType>(data: {
    organizationId: string;
    environmentId: string;
    identifier: string;
    address: ChannelAddressByType[T];
  }): UpdateChannelAddressCommand<T> {
    // Call BaseCommand.create with the correct constructor to ensure full inheritance chain validation
    // biome-ignore lint/complexity/noThisInStatic: Required to maintain proper this context for validation
    return BaseCommand.create.call(this, data);
  }
}
