import { BaseCommand } from '@novu/application-generic';
import type { AgentRuntime, UserSessionData } from '@novu/shared';
import { IsDefined, IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const AGENT_RUNTIMES = ['managed', 'self-hosted'] as const satisfies readonly AgentRuntime[];

export class GenerateManagedAgentCommand extends BaseCommand {
  @IsDefined()
  @IsObject()
  user: UserSessionData;

  @IsDefined()
  @IsString()
  @MinLength(8)
  @MaxLength(2000)
  prompt: string;

  /**
   * Target runtime for the generated agent. `managed` (default) populates Claude
   * tools/MCPs/skills from the catalog; `self-hosted` returns only name, identifier and
   * systemPrompt so the caller can wire up their own runtime.
   */
  @IsOptional()
  @IsString()
  @IsIn(AGENT_RUNTIMES)
  runtime?: AgentRuntime;
}
