import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelTypeEnum } from '@novu/shared';

/** Picked integration fields embedded on an agent–integration link response. */
export class AgentIntegrationResponseIntegrationDto {
  @ApiProperty({ description: 'Integration document _id.' })
  _id: string;

  @ApiProperty({
    description: 'The integration identifier (matches the integration store), not the internal MongoDB _id.',
  })
  identifier: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  providerId: string;

  @ApiPropertyOptional({
    description: 'Delivery channel; not set for agent-runtime integrations.',
    enum: ChannelTypeEnum,
    enumName: 'ChannelTypeEnum',
  })
  channel?: ChannelTypeEnum;

  @ApiProperty()
  active: boolean;

  @ApiPropertyOptional({
    description:
      'The Novu shared inbox address for this agent. Set whenever the cloud shared-inbox feature is enabled. ' +
      'The dashboard uses this as the headline inbound address and to render the shared inbox row in the inbox list.',
  })
  sharedInboundAddress?: string;

  @ApiPropertyOptional({
    description:
      'Default email From display name for this agent (NovuAgent integrations only). ' +
      'Falls back to the agent name when not explicitly stored on the integration credentials.',
  })
  defaultSenderName?: string;

  @ApiPropertyOptional({
    description:
      'When true, the worker drops inbound mail addressed to this agent on the shared `agentconnect.sh` domain. ' +
      'Custom-domain routes still deliver. Meaningful on cloud-enabled NovuAgent integrations; on self-hosted it ' +
      'is set defensively at provisioning time and is effectively redundant.',
  })
  sharedInboxDisabled?: boolean;
}

export class AgentIntegrationResponseDto {
  @ApiProperty({ description: 'Agent–integration link document id.' })
  _id: string;

  @ApiProperty()
  _agentId: string;

  @ApiProperty({ type: AgentIntegrationResponseIntegrationDto })
  integration: AgentIntegrationResponseIntegrationDto;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  _organizationId: string;

  @ApiPropertyOptional({
    description: 'Set when the agent–integration link received its first inbound webhook delivery.',
  })
  connectedAt?: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional({
    description:
      'Cloud only. `true` when this channel type (provider) falls outside the organization plan active-channel ' +
      'limit (by connection order). Active channels are counted per channel type, so multiple integrations of the ' +
      'same provider (e.g. several Slack workspaces) count as a single active channel. Over-limit channels keep ' +
      'their configuration but the agent will not respond on them until the plan is upgraded or older channel ' +
      'types are disconnected.',
  })
  exceedsPlanLimit?: boolean;
}
