import { ChannelTypeEnum, IEmailBlock, ChannelCTATypeEnum } from '@novu/shared';
import { IsDefined, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ICta } from '@novu/shared';

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
  cta?: ICta;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  subject?: string;
}
