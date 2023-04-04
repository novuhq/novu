import { IsDefined, IsObject } from 'class-validator';

import { BaseCommand } from '../../../../shared/commands';

export class CompileTemplateCommand extends BaseCommand {
  @IsDefined()
  template: string;

  @IsObject()
  data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}
