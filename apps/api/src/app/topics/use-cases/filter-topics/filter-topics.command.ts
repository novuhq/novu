import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { TopicKey } from '../../types';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class FilterTopicsCommand extends EnvironmentCommand {
  @IsString()
  @IsOptional()
  key?: TopicKey;

  @IsOptional()
  @IsInt()
  @Min(0)
  page?: number = 0;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  pageSize?: number = 10;
}
