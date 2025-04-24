import { IsArray, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { ChannelCTATypeEnum, IMessageAction } from '@novu/shared';

export class ChannelCTACommand {
  @IsEnum(ChannelCTATypeEnum)
  type: ChannelCTATypeEnum;

  @ValidateNested()
  data: {
    url: string;
  };

  @IsOptional()
  @IsArray()
  @ValidateNested()
  action?: IMessageAction[];
}
