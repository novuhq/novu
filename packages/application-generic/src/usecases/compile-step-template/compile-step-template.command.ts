import { IsDefined, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../commands/project.command';

export class CompileStepTemplateCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  content: string;

  @IsOptional()
  title?: string;

  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsString()
  @IsOptional()
  locale?: string;
}
