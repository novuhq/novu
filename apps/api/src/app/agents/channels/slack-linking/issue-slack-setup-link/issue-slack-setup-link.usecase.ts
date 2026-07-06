import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';

import { TelegramMobileLinkTokenService } from '../../../../telegram-linking/telegram-mobile-link-token.service';
import { IssueSlackSetupLinkCommand } from './issue-slack-setup-link.command';

export interface IssueSlackSetupLinkResult {
  token: string;
  /** Absolute URL the user can open to paste their Slack App Configuration Token. */
  url: string;
  /** ISO timestamp when the link expires. */
  expiresAt: string;
}

const SLACK_SETUP_PATH = '/agents/slack/connect';

@Injectable()
export class IssueSlackSetupLink {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly tokenService: TelegramMobileLinkTokenService
  ) {}

  async execute(command: IssueSlackSetupLinkCommand): Promise<IssueSlackSetupLinkResult> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id', 'identifier']
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.agentIdentifier}" was not found.`);
    }

    const integration = await this.integrationRepository.findOne(
      {
        _id: command.integrationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '_id providerId'
    );

    if (!integration) {
      throw new NotFoundException(`Integration ${command.integrationId} not found`);
    }

    if (integration.providerId !== ChatProviderIdEnum.Slack) {
      throw new BadRequestException('Slack setup link is only available for Slack integrations.');
    }

    const link = await this.agentIntegrationRepository.findOne(
      {
        _agentId: agent._id,
        _integrationId: integration._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (!link) {
      throw new NotFoundException('Integration is not linked to this agent');
    }

    const { token, expiresAt } = await this.tokenService.issueForSlackAgentSetup({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentIdentifier: agent.identifier,
      integrationId: integration._id,
    });

    return {
      token,
      expiresAt,
      url: this.buildSetupUrl(token),
    };
  }

  private buildSetupUrl(token: string): string {
    const base = (process.env.DASHBOARD_URL || process.env.FRONT_BASE_URL || 'https://dashboard.novu.co').replace(
      /\/$/,
      ''
    );

    return `${base}${SLACK_SETUP_PATH}/${token}`;
  }
}
