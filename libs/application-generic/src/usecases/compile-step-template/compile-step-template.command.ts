import { IsDefined, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../commands/project.command';

export class CompileStepTemplateCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  content: string;

  @IsOptional()
  title?: string;

  @IsDefined()
  payload: any;

  @IsString()
  @IsOptional()
  locale?: string;
}
