import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AgentRuntime } from '@novu/shared';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const AGENT_RUNTIMES = ['managed', 'self-hosted'] as const satisfies readonly AgentRuntime[];

export class GenerateManagedAgentRequestDto {
  @ApiProperty({
    description: 'Free-form description of the agent the user wants to create.',
    minLength: 8,
    maxLength: 2000,
    example: 'Review every new pull request for security issues, then post a concise risk summary as a PR comment.',
  })
  @IsDefined()
  @IsString()
  @MinLength(8)
  @MaxLength(2000)
  prompt: string;

  @ApiPropertyOptional({
    description:
      'Target runtime for the generated agent. `managed` (default) selects Claude tools/MCPs/skills from the catalog; `self-hosted` returns only name, identifier and systemPrompt so callers can wire up their own runtime.',
    enum: AGENT_RUNTIMES,
    default: 'managed',
  })
  @IsOptional()
  @IsString()
  @IsIn(AGENT_RUNTIMES)
  runtime?: AgentRuntime;
}

export class GeneratedManagedAgentSkillDto {
  @ApiProperty({ description: 'Anthropic pre-built skill identifier (e.g. "xlsx").' })
  @IsString()
  @IsNotEmpty()
  skillId: string;
}

export class GenerateManagedAgentResponseDto {
  @ApiProperty({ description: 'Human readable agent name.' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Stable kebab-case identifier derived from the name.' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ description: 'System prompt to send to Claude when invoking the agent.' })
  @IsString()
  @IsNotEmpty()
  systemPrompt: string;

  @ApiProperty({ description: 'Subset of Claude built-in tool types the agent should have.', type: [String] })
  @IsArray()
  @IsString({ each: true })
  tools: string[];

  @ApiProperty({ description: 'MCP server catalog IDs the agent should be connected to.', type: [String] })
  @IsArray()
  @IsString({ each: true })
  mcpServers: string[];

  @ApiProperty({ description: 'Anthropic pre-built skills to attach.', type: [GeneratedManagedAgentSkillDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeneratedManagedAgentSkillDto)
  skills: GeneratedManagedAgentSkillDto[];
}
