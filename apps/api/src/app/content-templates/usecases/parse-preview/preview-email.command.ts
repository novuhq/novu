import { IsDefined, IsString } from 'class-validator';
import { IEmailBlock } from '@novu/dal';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { MessageTemplateContentType } from '@novu/shared';

export class PreviewEmailCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  content: string | IEmailBlock[];

  @IsString()
  contentType: MessageTemplateContentType;

  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsString()
  subject: string;
}
