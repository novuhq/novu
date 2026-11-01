import { Injectable } from '@nestjs/common';
import type { EmailLayoutMessage, EmailLayoutResult } from '@novu/chat-adapter-email';
import { AgentRepository, HumanContactRepository, SubscriberRepository } from '@novu/dal';
import { buildHumanAgentEmail } from '../../human/email/human-agent-email.template';
import type { HumanEmailParties } from '../../human/email/human-email-layout';
import { agentPictureOrDefaultUrl } from '../../human/services/agent-picture-url';
import { HumanOperatorService } from '../../human/services/human-operator.service';
import { buildRelayOwnerName, resolveRelayAgentName } from '../../human/services/relay-owner-name';
import type { ResolvedAgentConfig } from '../channels/agent-config-resolver.service';

type EmailScope = { environmentId: string; organizationId: string; agentId: string; recipientAddress: string };

/**
 * The look of the emails Agent Inbox agents send. Only their adapters get this layout, so the emails of every
 * other agent, such as Novu Connect's, stay as the email adapter renders them.
 */
@Injectable()
export class HumanRelayEmailService {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly humanContactRepository: HumanContactRepository,
    private readonly operatorService: HumanOperatorService
  ) {}

  async layout(
    config: ResolvedAgentConfig,
    recipientAddress: string,
    message: EmailLayoutMessage
  ): Promise<EmailLayoutResult> {
    const parties = await this.findParties({
      environmentId: config.environmentId,
      organizationId: config.organizationId,
      agentId: config.agentId,
      recipientAddress,
    });

    return buildHumanAgentEmail({ ...parties, message });
  }

  /** Who is writing and who to, read fresh for each email so a new name or picture shows at once. */
  async findParties(scope: EmailScope): Promise<HumanEmailParties> {
    const [agent, operatorId, contacts] = await Promise.all([
      this.agentRepository.findOne(
        { _id: scope.agentId, _environmentId: scope.environmentId, _organizationId: scope.organizationId },
        ['_id', '_environmentId', 'name', 'picture']
      ),
      this.operatorService.findForAgent(scope),
      this.humanContactRepository.findContactsByEmailAddress(
        scope.environmentId,
        scope.agentId,
        scope.recipientAddress
      ),
    ]);
    const contactId = contacts[0]?.subscriberId;
    const subscriberIds = [operatorId, contactId].filter((id): id is string => Boolean(id));
    const people =
      subscriberIds.length > 0
        ? await this.subscriberRepository.find(
            { _environmentId: scope.environmentId, subscriberId: { $in: subscriberIds } },
            'subscriberId firstName lastName'
          )
        : [];
    const operator = people.find((person) => person.subscriberId === operatorId);
    const contact = people.find((person) => person.subscriberId === contactId);
    const agentName = resolveRelayAgentName(agent);
    const operatorName = buildRelayOwnerName(operator?.firstName, operator?.lastName);
    const contactName = buildRelayOwnerName(contact?.firstName, contact?.lastName);
    const contactFirstName = contact?.firstName?.trim();

    return {
      sender: {
        ...(agentName ? { agentName } : {}),
        ...(operatorName ? { operatorName } : {}),
        pictureUrl: agentPictureOrDefaultUrl(agent ?? { _id: scope.agentId, _environmentId: scope.environmentId }),
      },
      recipient: {
        ...(contactName ? { name: contactName } : {}),
        ...(contactFirstName ? { firstName: contactFirstName } : {}),
      },
    };
  }
}
