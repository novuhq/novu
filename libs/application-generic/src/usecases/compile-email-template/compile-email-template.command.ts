import { IsDefined, IsOptional, IsString } from 'class-validator';
import { IEmailBlock } from '@novu/dal';
import { LayoutId, MessageTemplateContentType } from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../commands/project.command';

export class CompileEmailTemplateCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  content: string | IEmailBlock[];

  @IsString()
  contentType: MessageTemplateContentType;

  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  layoutId?: LayoutId | null;

  @IsString()
  @IsOptional()
  preheader?: string | null;

  @IsString()
  @IsOptional()
  senderName?: string | null;

  @IsString()
  @IsOptional()
  locale?: string;
}
