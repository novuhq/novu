import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { TopicKey } from '../../types';

export class FilterTopicsCommand extends EnvironmentCommand {
  @IsString()
  @IsOptional()
  key?: TopicKey;

  @IsString()
  @IsOptional()
  name?: string;

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
