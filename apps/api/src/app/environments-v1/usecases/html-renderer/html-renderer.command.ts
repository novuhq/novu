import { IsBoolean, IsDefined, IsObject, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '@novu/application-generic';

export class HtmlRendererCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  content: string;

  @IsBoolean()
  @IsDefined()
  disableOutputSanitization: boolean;

  @IsObject()
  @IsDefined()
  payload: object;

  @IsBoolean()
  @IsOptional()
  noHtmlWrappingTags?: boolean;
}
