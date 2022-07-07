import { ChannelTypeEnum, IEmailBlock, ChannelCTATypeEnum } from '@novu/shared';
import { IsDefined, IsEnum, IsOptional, IsString, IsUrl, ValidateIf, ValidateNested } from 'class-validator';

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
  cta?: ChannelCTADto;

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
