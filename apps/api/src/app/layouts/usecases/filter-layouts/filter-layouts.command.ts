import { IsNumber, IsOptional, IsString } from 'class-validator';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

import { OrderDirectionEnum } from '../../types';

export class FilterLayoutsCommand extends EnvironmentCommand {
  @IsNumber()
  @IsOptional()
  page?: number = 0;

  @IsNumber()
  @IsOptional()
  pageSize?: number = 10;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsNumber()
  @IsOptional()
  orderBy?: OrderDirectionEnum;
}
