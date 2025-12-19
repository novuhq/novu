import { IsArray, IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetSubscriptionCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  topicKey: string;

  @IsString()
  @IsDefined()
  subscriptionIdOrIdentifier: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  workflowIdentifiers?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
