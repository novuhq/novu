import { IsNumber, IsOptional, IsString } from 'class-validator';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class FilterLayoutsCommand extends EnvironmentCommand {
  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  pageSize?: number;
}
