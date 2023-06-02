import { IsNumber, IsOptional, IsString } from 'class-validator';

import { SubscriberId, TopicKey } from '../../types';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class FilterTopicsCommand extends EnvironmentCommand {
  @IsString()
  @IsOptional()
  key?: TopicKey;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsString()
  @IsOptional()
  subscriberId?: SubscriberId;

  @IsNumber()
  @IsOptional()
  pageSize?: number;
}
