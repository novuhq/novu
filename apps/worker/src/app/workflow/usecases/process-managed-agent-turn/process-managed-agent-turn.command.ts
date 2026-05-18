import { EnvironmentCommand } from '@novu/application-generic';
import { IsDefined, IsOptional, IsString } from 'class-validator';

export class ProcessManagedAgentTurnCommand extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  agentId: string;

  @IsDefined()
  @IsString()
  conversationId: string;

  @IsDefined()
  @IsString()
  integrationIdentifier: string;

  @IsDefined()
  @IsString()
  agentIdentifier: string;

  @IsDefined()
  @IsString()
  platform: string;

  @IsDefined()
  @IsString()
  messageText: string;

  @IsOptional()
  @IsString()
  subscriberId?: string;

  @IsOptional()
  @IsString()
  subscriberFirstName?: string;

  @IsDefined()
  @IsString()
  platformThreadId: string;
}
