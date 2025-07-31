import { IMessageCTA } from '@novu/shared';
import { IsDefined, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../commands/project.command';

export class CompileInAppTemplateCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  content?: string;

  @IsDefined()
  payload: any;

  @IsOptional()
  cta?: IMessageCTA;

  @IsString()
  @IsOptional()
  locale?: string;
}
