import { IsDefined, IsString } from 'class-validator';
import { IEmailBlock } from '@novu/dal';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class PreviewEmailCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  content: string | IEmailBlock[];

  @IsString()
  contentType: 'editor' | 'customHtml';
}
