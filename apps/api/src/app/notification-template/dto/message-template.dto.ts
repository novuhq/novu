import { IsDefined, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ChannelTypeEnum, IEmailBlock, ChannelCTATypeEnum, IMessageCTA } from '@novu/shared';

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
  feedId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  title?: string;
}
