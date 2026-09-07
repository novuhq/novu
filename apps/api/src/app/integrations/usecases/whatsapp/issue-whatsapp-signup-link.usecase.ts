import { BadRequestException, Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';

import { resolveDashboardBaseUrl } from '../../../shared/helpers';
import type { IssueWhatsAppSignupLinkResponseDto } from '../../dtos/whatsapp-signup-link.dto';
import { WhatsAppSignupLinkTokenService } from '../../whatsapp-signup-link-token.service';
import { IssueWhatsAppSignupLinkCommand } from './issue-whatsapp-signup-link.command';
import { resolveWhatsAppAgentIntegration } from './resolve-whatsapp-agent-integration.utils';
import { WhatsAppEmbeddedSignupAvailabilityCommand } from './whatsapp-embedded-signup-availability.command';
import { WhatsAppEmbeddedSignupAvailability } from './whatsapp-embedded-signup-availability.usecase';

const SIGNUP_PATH = '/agents/whatsapp/connect';

/**
 * Mints an opaque, single-use signup link for the public WhatsApp Embedded
 * Signup page. Callable with keyless sessions (the connect CLI) as well as
 * API keys — the returned URL carries all the context the unauthenticated
 * page needs via the Redis-backed token.
 */
@Injectable()
export class IssueWhatsAppSignupLink {
  constructor(
    private readonly availabilityUsecase: WhatsAppEmbeddedSignupAvailability,
    private readonly tokenService: WhatsAppSignupLinkTokenService,
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: IssueWhatsAppSignupLinkCommand): Promise<IssueWhatsAppSignupLinkResponseDto> {
    const availability = await this.availabilityUsecase.execute(
      WhatsAppEmbeddedSignupAvailabilityCommand.create({
        userId: command.userId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      })
    );
    if (!availability.available) {
      throw new BadRequestException({
        code: availability.reason,
        message: 'WhatsApp Embedded Signup is not available on this deployment for this organization.',
      });
    }

    const { agent, integration } = await resolveWhatsAppAgentIntegration({
      agentRepository: this.agentRepository,
      integrationRepository: this.integrationRepository,
      agentIntegrationRepository: this.agentIntegrationRepository,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentIdentifier: command.agentIdentifier,
      integrationIdentifier: command.integrationIdentifier,
    });

    const { token, expiresAt } = await this.tokenService.issue({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentIdentifier: agent.identifier,
      integrationIdentifier: integration.identifier,
    });

    return {
      token,
      expiresAt,
      url: this.buildSignupUrl(token),
    };
  }

  private buildSignupUrl(token: string): string {
    return `${resolveDashboardBaseUrl()}${SIGNUP_PATH}/${token}`;
  }
}
