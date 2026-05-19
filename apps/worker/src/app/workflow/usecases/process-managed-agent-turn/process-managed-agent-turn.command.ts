import { EnvironmentCommand, type IManagedAgentToolConfirmation } from '@novu/application-generic';
import { Type } from 'class-transformer';
import { IsBoolean, IsDefined, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

class ToolConfirmationCommand implements IManagedAgentToolConfirmation {
  @IsDefined()
  @IsString()
  toolUseId: string;

  @IsDefined()
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  denyMessage?: string;
}

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

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ToolConfirmationCommand)
  toolConfirmation?: ToolConfirmationCommand;
}
