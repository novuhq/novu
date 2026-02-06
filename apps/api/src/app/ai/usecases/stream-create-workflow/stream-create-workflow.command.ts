import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { BaseMessage } from 'langchain';

export class StreamCreateWorkflowCommand extends EnvironmentWithUserObjectCommand {
  @IsOptional()
  @IsArray()
  messages?: Array<BaseMessage> | null;

  @IsOptional()
  signal?: AbortSignal;
}
