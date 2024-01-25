import { IsDefined } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../commands/project.command';

export class CompileStepTemplateCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  content: string;

  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}
