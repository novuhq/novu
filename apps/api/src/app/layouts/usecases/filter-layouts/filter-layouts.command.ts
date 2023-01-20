import { IsNumber, IsOptional, IsString } from 'class-validator';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

import { OrderDirectionEnum } from '../../types';

export class FilterLayoutsCommand extends EnvironmentCommand {
  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  pageSize?: number;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsNumber()
  @IsOptional()
  orderBy?: OrderDirectionEnum;
}
