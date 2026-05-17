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
      'The "headline" inbound address surfaced to the user. Resolves to ' +
      '`credentials.primaryInboundAddress` when set and still valid, otherwise to the synthetic shared inbox ' +
      '(`{emailSlugPrefix}-{inboxRoutingKey}@<shared-domain>`). Only present on cloud when the shared-inbox ' +
      'feature is enabled; remains set even when the integration is paused so the dashboard can still display ' +
      'the address.',
  })
  defaultInboundAddress?: string;

  @ApiPropertyOptional({
    description:
      'The Novu shared inbox address for this agent. Set whenever the cloud shared-inbox feature is enabled, ' +
      'independent of which address is currently primary. The dashboard uses this to render the shared inbox ' +
      'row in the inbox list manager even when the user has flipped a custom domain to primary.',
  })
  sharedInboundAddress?: string;

  @ApiPropertyOptional({
    description:
      'When true, the worker drops inbound mail addressed to this agent on the shared `agentconnect.sh` domain. ' +
      'Custom-domain routes still deliver. Only meaningful on cloud-enabled NovuAgent integrations.',
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
    description: 'Set when the agent–integration link has been used (e.g. first credential resolution).',
  })
  connectedAt?: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
