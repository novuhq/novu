import { Injectable } from '@nestjs/common';
import { StepTypeEnum } from '@novu/shared';
import { SendMessageCommand } from './send-message.command';
import { SendMessageEmail } from './send-message-email.usecase';
import { SendMessageSms } from './send-message-sms.usecase';
import { SendMessageInApp } from './send-message-in-app.usecase';
import { SendMessageChat } from './send-message-chat.usecase';
import { SendMessagePush } from './send-message-push.usecase';
import { Digest } from './digest/digest.usecase';
import { matchMessageWithFilters } from '../trigger-event/message-filter.matcher';
import { SubscriberRepository } from '@novu/dal';

@Injectable()
export class SendMessage {
  constructor(
    private sendMessageEmail: SendMessageEmail,
    private sendMessageSms: SendMessageSms,
    private sendMessageInApp: SendMessageInApp,
    private sendMessageChat: SendMessageChat,
    private sendMessagePush: SendMessagePush,
    private digest: Digest,
    private subscriberRepository: SubscriberRepository
  ) {}

  public async execute(command: SendMessageCommand) {
    const shouldRun = await this.filter(command);

    if (!shouldRun) {
      return;
    }

    switch (command.step.template.type) {
      case StepTypeEnum.SMS:
        return await this.sendMessageSms.execute(command);
      case StepTypeEnum.IN_APP:
        return await this.sendMessageInApp.execute(command);
      case StepTypeEnum.EMAIL:
        return await this.sendMessageEmail.execute(command);
      case StepTypeEnum.CHAT:
        return await this.sendMessageChat.execute(command);
      case StepTypeEnum.PUSH:
        return await this.sendMessagePush.execute(command);
      case StepTypeEnum.DIGEST:
        return await this.digest.execute(command);
    }
  }

  private async filter(command: SendMessageCommand) {
    const data = await this.getFilterData(command);

    return matchMessageWithFilters(command.step, data);
  }

  private async getFilterData(command: SendMessageCommand) {
    const fetchSubscriber = command.step?.filters?.find((filter) => {
      return filter?.children?.find((item) => item?.on === 'subscriber');
    });

    let subscriber = undefined;

    if (fetchSubscriber) {
      /// TODO: refactor command.subscriberId to command._subscriberId
      subscriber = await this.subscriberRepository.findById(command.subscriberId);
    }

    return {
      subscriber,
      payload: command.payload,
    };
  }
}
