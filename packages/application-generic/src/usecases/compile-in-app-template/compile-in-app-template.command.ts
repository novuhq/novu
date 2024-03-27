import { IsDefined, IsOptional, IsString } from 'class-validator';
import { IMessageCTA } from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../commands/project.command';

export class CompileInAppTemplateCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  content?: string;

  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsOptional()
  cta?: IMessageCTA;

  @IsString()
  @IsOptional()
  locale?: string;
}
