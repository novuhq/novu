import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AgentRuntime, AgentVisibility } from '@novu/shared';

import { AgentBehaviorDto } from './agent-behavior.dto';
import { AgentIntegrationSummaryDto } from './agent-integration-summary.dto';
import { AgentMcpServerDto, AgentToolDto } from './agent-runtime-config.dto';

export class ManagedRuntimeResponseDto {
  @ApiProperty()
  providerId: string;

  @ApiProperty()
  integrationId: string;

  @ApiProperty()
  externalAgentId: string;

  @ApiPropertyOptional({
    description:
      'The provider-side environment that hosts this agent. ' +
      'Hydrated from the linked integration credentials. Absent when the integration has not been provisioned.',
  })
  externalEnvironmentId?: string;

  @ApiPropertyOptional({
    description:
      'The provider-side workspace id used in console deep links. ' +
      "Defaults to `'default'` (the auto-created Default Workspace). " +
      'Hydrated from the linked integration credentials.',
  })
  externalWorkspaceId?: string;

  @ApiPropertyOptional({
    description: 'Deep link to the agent in the provider console (e.g. platform.claude.com).',
  })
  consoleUrl?: string;

  @ApiPropertyOptional({
    type: [AgentToolDto],
    description:
      'Live tools enabled on the managed-runtime provider for this agent. ' +
      'Sourced from the provider on read; omitted when the provider is temporarily unreachable.',
  })
  tools?: AgentToolDto[];

  @ApiPropertyOptional({
    type: [AgentMcpServerDto],
    description:
      'MCP servers enabled on this agent, projected onto the runtime catalog `{ externalId, name, url }` shape. ' +
      'Mongo is the source of truth; the projection matches what the provider sees. ' +
      'Omitted when the provider read fails after a managed-agent write.',
  })
  mcpServers?: AgentMcpServerDto[];

  @ApiPropertyOptional({
    description: 'System prompt used when invoking the agent.',
  })
  systemPrompt?: string;
}

export class AgentResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  identifier: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ type: AgentBehaviorDto })
  behavior?: AgentBehaviorDto;

  @ApiProperty()
  active: boolean;

  @ApiPropertyOptional({ description: 'Production bridge URL' })
  bridgeUrl?: string;

  @ApiPropertyOptional({ description: 'Development bridge URL (set by npx novu dev)' })
  devBridgeUrl?: string;

  @ApiPropertyOptional({ description: 'Whether the dev bridge override is active' })
  devBridgeActive?: boolean;

  @ApiPropertyOptional({
    enum: ['self-hosted', 'managed'],
    description: 'Whether the agent brain is self-hosted (bridge) or managed by a third-party provider',
  })
  runtime?: AgentRuntime;

  @ApiPropertyOptional({
    enum: ['public', 'private'],
    description:
      'Discovery scope of the agent. Always `public` today; reserved for the upcoming private-agents feature.',
  })
  visibility?: AgentVisibility;

  @ApiPropertyOptional({
    type: ManagedRuntimeResponseDto,
    description: 'Present when runtime is "managed". Contains provider and external identifiers.',
  })
  managedRuntime?: ManagedRuntimeResponseDto;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  _organizationId: string;

  @ApiPropertyOptional({ description: 'Mongo user id of the user who created the agent' })
  createdBy?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional({ type: [AgentIntegrationSummaryDto] })
  integrations?: AgentIntegrationSummaryDto[];

  @ApiPropertyOptional({
    description:
      'Cloud only. `true` when the agent falls outside the organization plan agent limit ' +
      '(by creation order among active agents — inactive agents do not consume slots). ' +
      'Only plan limits produce this flag — system-capped organizations (enterprise/unlimited tiers) are never ' +
      'over-limit. Over-limit agents are still stored but will not respond to inbound messages until the plan is ' +
      'upgraded or older agents are deactivated.',
  })
  exceedsPlanLimit?: boolean;
}
