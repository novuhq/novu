import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { HumanContactRepository, SubscriberRepository } from '@novu/dal';
import { isAgentProvisionedSubscriber } from '../../../agents/conversation-runtime/conversation/agent-subscriber-resolver.service';
import type { UpdateContactResponseDto } from '../../dtos/list-contacts.dto';
import { HumanInboxService } from '../../services/human-inbox.service';
import { HumanOperatorService } from '../../services/human-operator.service';
import { SetContactCanWakeCommand } from './set-contact-can-wake.command';

/** Machine-readable code of the answer to a switch on the operator's own contact, which has none. */
export const CONTACT_IS_OPERATOR = 'contact_is_operator';

/** Machine-readable code of the answer to a switch on someone the agent only knows as a stranger. */
export const CONTACT_IS_STRANGER = 'contact_is_stranger';

/**
 * The "can wake" switch of one contact: whether a message from them may wake one of the agent's hosts. Off
 * until the operator turns it on. The operator always can, so their own contact has none, and a stranger
 * never can, so theirs can't be turned on.
 */
@Injectable()
export class SetContactCanWake {
  constructor(
    private readonly inbox: HumanInboxService,
    private readonly humanOperator: HumanOperatorService,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly humanContactRepository: HumanContactRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: SetContactCanWakeCommand): Promise<UpdateContactResponseDto> {
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
        message: 'You can always wake your agent’s hosts, so your own contact has no switch.',
      });
    }

    if (isAgentProvisionedSubscriber(subscriber)) {
      throw new BadRequestException({
        code: CONTACT_IS_STRANGER,
        message: 'Only your contacts can wake your agent’s hosts. Invite them first.',
      });
    }

    await this.humanContactRepository.setCanWake({
      ...scope,
      agentId: agent._id,
      subscriberId: subscriber.subscriberId,
      canWake: command.canWake,
    });

    return { id: subscriber.subscriberId, canWake: command.canWake };
  }
}
