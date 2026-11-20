import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { HumanContactRepository, SubscriberRepository } from '@novu/dal';
import { isAgentProvisionedSubscriber } from '../../../agents/conversation-runtime/conversation/agent-subscriber-resolver.service';
import type { UpdateContactResponseDto } from '../../dtos/list-contacts.dto';
import { HumanInboxService } from '../../services/human-inbox.service';
import { HumanOperatorService } from '../../services/human-operator.service';
import { SetContactListenToCommand } from './set-contact-listen-to.command';

/** Machine-readable code of the answer to a switch on the operator's own contact, which has none. */
export const CONTACT_IS_OPERATOR = 'contact_is_operator';

/** Machine-readable code of the answer to a switch on someone the agent only knows as a stranger. */
export const CONTACT_IS_STRANGER = 'contact_is_stranger';

/**
 * The "Listen to" switch of one contact: whether a message from them may start one of the agent's hosts. Off
 * until the operator turns it on. The agent always listens to the operator, so their own contact has none, and
 * never to a stranger, so theirs can't be turned on.
 */
@Injectable()
export class SetContactListenTo {
  constructor(
    private readonly inbox: HumanInboxService,
    private readonly humanOperator: HumanOperatorService,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly humanContactRepository: HumanContactRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: SetContactListenToCommand): Promise<UpdateContactResponseDto> {
    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const agent = await this.inbox.resolveRelayAgent(scope, command.agentIdentifier);
    const [subscriber, operatorId] = await Promise.all([
      this.subscriberRepository.findOne(
        {
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
          subscriberId: command.subscriberId,
        },
        'subscriberId data'
      ),
      this.humanOperator.findForAgent({ ...scope, agentId: agent._id }),
    ]);

    if (!subscriber) {
      throw new NotFoundException(`Contact "${command.subscriberId}" was not found.`);
    }

    if (subscriber.subscriberId === operatorId) {
      throw new BadRequestException({
        code: CONTACT_IS_OPERATOR,
        message: 'Your agent always listens to you, so your own contact has no switch.',
      });
    }

    if (isAgentProvisionedSubscriber(subscriber)) {
      throw new BadRequestException({
        code: CONTACT_IS_STRANGER,
        message: 'Your agent listens only to your contacts. Invite them first.',
      });
    }

    await this.humanContactRepository.setListenTo({
      ...scope,
      agentId: agent._id,
      subscriberId: subscriber.subscriberId,
      listenTo: command.listenTo,
    });

    return { id: subscriber.subscriberId, listenTo: command.listenTo };
  }
}
