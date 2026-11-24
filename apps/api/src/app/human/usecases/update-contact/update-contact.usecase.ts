import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { HumanContactRepository, SubscriberRepository } from '@novu/dal';
import { isAgentProvisionedSubscriber } from '../../../agents/conversation-runtime/conversation/agent-subscriber-resolver.service';
import type { UpdateContactResponseDto } from '../../dtos/list-contacts.dto';
import { HumanInboxService } from '../../services/human-inbox.service';
import { HumanOperatorService } from '../../services/human-operator.service';
import { UpdateContactCommand } from './update-contact.command';

/** Machine-readable code of the answer to a switch on the operator's own contact, which has none. */
export const CONTACT_IS_OPERATOR = 'contact_is_operator';

/** Machine-readable code of the answer to a switch on someone the agent only knows as a stranger. */
export const CONTACT_IS_STRANGER = 'contact_is_stranger';

/** Machine-readable code of the answer to full access for someone the agent doesn't listen to. */
export const CONTACT_NOT_LISTENED_TO = 'contact_not_listened_to';

/** Machine-readable code of the answer to a change that names no switch. */
export const NOTHING_TO_CHANGE = 'nothing_to_change';

/**
 * A contact's two switches, as the operator turns them on the dashboard:
 * - "Listen to": whether a message from them may start one of the agent's hosts;
 * - "Full access": whether such a message starts it with everything the operator's own messages get, the hosts
 *   asking them, not the operator, before doing what needs an OK.
 *
 * Both are off until the operator turns them on. Full access only turns on while the agent listens to them, and
 * turning "Listen to" off turns it off too. The agent always listens to the operator, with everything, so their own
 * contact has no switches; it never listens to a stranger, so theirs can't be turned on.
 */
@Injectable()
export class UpdateContact {
  constructor(
    private readonly inbox: HumanInboxService,
    private readonly humanOperator: HumanOperatorService,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly humanContactRepository: HumanContactRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: UpdateContactCommand): Promise<UpdateContactResponseDto> {
    if (command.listenTo === undefined && command.fullAccess === undefined) {
      throw new BadRequestException({
        code: NOTHING_TO_CHANGE,
        message: 'Say which switch to change: `listenTo`, `fullAccess`, or both.',
      });
    }

    if (command.listenTo === false && command.fullAccess === true) {
      throw new BadRequestException({
        code: CONTACT_NOT_LISTENED_TO,
        message: 'Full access only works while your agent listens to them.',
      });
    }

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
        message: 'Your agent always listens to you, with full access, so your own contact has no switches.',
      });
    }

    if (isAgentProvisionedSubscriber(subscriber)) {
      throw new BadRequestException({
        code: CONTACT_IS_STRANGER,
        message: 'Your agent listens only to your contacts. Invite them first.',
      });
    }

    const contact = { agentId: agent._id, subscriberId: subscriber.subscriberId };
    if (command.listenTo !== undefined) {
      await this.humanContactRepository.setListenTo({ ...scope, ...contact, listenTo: command.listenTo });
    }

    if (command.fullAccess !== undefined) {
      const saved = await this.humanContactRepository.setFullAccess({
        environmentId: command.environmentId,
        ...contact,
        fullAccess: command.fullAccess,
      });
      if (!saved) {
        throw new BadRequestException({
          code: CONTACT_NOT_LISTENED_TO,
          message: 'Turn on Listen to for them first: full access only works while your agent listens to them.',
        });
      }
    }

    const row = await this.humanContactRepository.findOne(
      { _environmentId: command.environmentId, _agentId: agent._id, subscriberId: subscriber.subscriberId },
      ['listenTo', 'fullAccess']
    );
    const listenTo = row?.listenTo === true;

    return { id: subscriber.subscriberId, listenTo, fullAccess: listenTo && row?.fullAccess === true };
  }
}
