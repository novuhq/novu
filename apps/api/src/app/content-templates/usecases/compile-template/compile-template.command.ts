import { IsDefined, IsObject, IsOptional } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';

export class CompileTemplateCommand {
  static create(data: CompileTemplateCommand) {
    return CommandHelper.create<CompileTemplateCommand>(CompileTemplateCommand, data);
  }

  @IsDefined()
  templateId: 'basic' | 'custom';

  @IsOptional()
  customTemplate?: string;

  @IsObject()
  data: any;
}
