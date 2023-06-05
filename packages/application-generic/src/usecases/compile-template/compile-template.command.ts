import {
  IsBoolean,
  IsDefined,
  IsObject,
  IsString,
  IsOptional,
} from 'class-validator';

import { BaseCommand } from '../../commands/base.command';

export class CompileTemplateCommand extends BaseCommand {
  @IsDefined()
  template: string;

  @IsObject()
  data: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsOptional()
  @IsBoolean()
  translate?: boolean;

  @IsOptional()
  @IsString()
  locale?: string;
}
