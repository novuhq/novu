import { BadRequestException } from '@nestjs/common';
import { buildAgentSharedInbox, decryptCredentials, isAgentSharedInboxEnabled } from '@novu/application-generic';
import { AgentIntegrationRepository, IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';

export type ResolvedAgentOutboundEmail = {
  /** Decrypted (or demo-hydrated) integration ready for MailFactory. */
  senderIntegration: IntegrationEntity;
  from: string;
  senderName: string;
  /** The NovuAgent inbound integration linked to the agent. */
  emailIntegration: IntegrationEntity;
};

/**
 * Resolves the outbound email sender for an agent that has a NovuAgent email
 * integration linked. Shared by the agent test-email path and human
 * verification emails so both go through the same from/senderName plumbing.
 */
export async function resolveAgentOutboundEmail(params: {
  environmentId: string;
  organizationId: string;
  agentId: string;
  agentName: string;
  integrationRepository: IntegrationRepository;
  agentIntegrationRepository: AgentIntegrationRepository;
}): Promise<ResolvedAgentOutboundEmail> {
  const links = await params.agentIntegrationRepository.findLinksForAgents({
    organizationId: params.organizationId,
    environmentId: params.environmentId,
    agentIds: [params.agentId],
  });

  const integrationIds = links.map((link) => link._integrationId).filter(Boolean);
  if (integrationIds.length === 0) {
    throw new BadRequestException('No email integration linked to this agent.');
  }

  const [emailIntegration] = await params.integrationRepository.find({
    _id: { $in: integrationIds },
    _environmentId: params.environmentId,
    _organizationId: params.organizationId,
    providerId: EmailProviderIdEnum.NovuAgent,
    channel: ChannelTypeEnum.EMAIL,
  });

  if (!emailIntegration) {
    throw new BadRequestException('No Novu Email integration found for this agent.');
  }

  const outboundIntegrationId = emailIntegration.credentials?.outboundIntegrationId as string | undefined;
  const agentInboundFrom = resolveAgentInboundFrom(emailIntegration);
  const senderName = resolveAgentSenderName(emailIntegration, params.agentName);

  const senderIntegration = await findSenderIntegration(
    params.integrationRepository,
    params.environmentId,
    params.organizationId,
    outboundIntegrationId,
    { agentInboundFrom, senderName }
  );
  const outboundFrom = senderIntegration.credentials?.from as string | undefined;
  const from = agentInboundFrom || outboundFrom;

  if (!from) {
    throw new BadRequestException('Agent email integration has no from address configured.');
  }

  return { senderIntegration, from, senderName, emailIntegration };
}

function resolveAgentInboundFrom(emailIntegration: IntegrationEntity): string | undefined {
  const slug = emailIntegration.credentials?.emailSlugPrefix;
  const inboxRoutingKey = emailIntegration.credentials?.inboxRoutingKey;
  const sharedInboxDisabled = Boolean(emailIntegration.credentials?.sharedInboxDisabled);
  if (!isAgentSharedInboxEnabled() || !slug || !inboxRoutingKey || sharedInboxDisabled) {
    return undefined;
  }

  try {
    return buildAgentSharedInbox(slug, inboxRoutingKey);
  } catch {
    return undefined;
  }
}

function resolveAgentSenderName(emailIntegration: IntegrationEntity, agentName: string): string {
  const stored = emailIntegration.credentials?.senderName;
  if (typeof stored === 'string' && stored.trim()) {
    return stored.trim();
  }

  return agentName;
}

async function findSenderIntegration(
  integrationRepository: IntegrationRepository,
  environmentId: string,
  organizationId: string,
  outboundIntegrationId: string | undefined,
  delivery: { agentInboundFrom?: string; senderName: string }
): Promise<IntegrationEntity> {
  if (!outboundIntegrationId) {
    throw new BadRequestException('Agent has no outbound email integration configured.');
  }

  const configured = await integrationRepository.findOne({
    _id: outboundIntegrationId,
    _environmentId: environmentId,
    _organizationId: organizationId,
    channel: ChannelTypeEnum.EMAIL,
    active: true,
  });

  if (!configured) {
    throw new BadRequestException('Configured outbound integration not found or inactive.');
  }

  // The Novu demo email integration ships with empty stored credentials — the
  // real SendGrid API key lives in NOVU_EMAIL_INTEGRATION_API_KEY.
  if (configured.providerId === EmailProviderIdEnum.Novu) {
    return {
      ...configured,
      credentials: {
        apiKey: process.env.NOVU_EMAIL_INTEGRATION_API_KEY,
        from: delivery.agentInboundFrom ?? 'no-reply@novu.co',
        senderName: delivery.senderName,
        ipPoolName: 'Demo',
      },
    };
  }

  return { ...configured, credentials: decryptCredentials(configured.credentials ?? {}) };
}
