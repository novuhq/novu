import { IsNumber, IsOptional, IsString } from 'class-validator';

import { TopicKey } from '../../types';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class FilterTopicsCommand extends EnvironmentCommand {
  @IsString()
  @IsOptional()
  key?: TopicKey;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  pageSize?: number;
}
