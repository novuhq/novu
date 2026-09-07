import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class ListSubscriberSubscriptionsCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  subscriberId: string;

  @IsString()
  @IsOptional()
  topicKey?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contextKeys?: string[];

  @IsOptional()
  limit?: number;

  @IsOptional()
  after?: string;

  @IsOptional()
  before?: string;

  @IsOptional()
  orderBy?: string;

  @IsOptional()
  orderDirection?: number;

  @IsOptional()
  includeCursor?: boolean;
}
