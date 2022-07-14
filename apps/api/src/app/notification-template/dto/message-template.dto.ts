import { ChannelTypeEnum, IEmailBlock, ChannelCTATypeEnum, IMessageCTA } from '@novu/shared';
import { IsDefined, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';

class ChannelCTADto {
  @IsEnum(ChannelCTATypeEnum)
  type: ChannelCTATypeEnum;

  @ValidateNested()
  data: {
    url: string;
  };
}

export class MessageTemplateDto {
  @IsOptional()
  @IsEnum(ChannelTypeEnum)
  type: ChannelTypeEnum;

  @IsDefined()
  content: string | IEmailBlock[];

  @IsOptional()
  contentType?: 'editor' | 'customHtml';

  @IsOptional()
  @ValidateNested()
  cta?: IMessageCTA;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  subject?: string;
}
