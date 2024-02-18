import { IsDefined, IsOptional } from 'class-validator';
import { IMessageCTA } from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../commands/project.command';

export class CompileInAppTemplateCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  content: string;

  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsOptional()
  cta?: IMessageCTA;
}
