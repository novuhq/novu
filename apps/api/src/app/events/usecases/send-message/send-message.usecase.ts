import { Injectable } from '@nestjs/common';
import { ChannelTypeEnum } from '@novu/shared';
import { SendMessageCommand } from './send-message.command';
import { SendMessageEmail } from './send-message-email.usecase';
import { SendMessageSms } from './send-message-sms.usecase';
import { SendMessageInApp } from './send-message-in-app.usecase';
import { SendMessagePush } from './send-message-push.usecase';
import { Digest } from './digest/digest.usecase';

@Injectable()
export class SendMessage {
  constructor(
    private sendMessageEmail: SendMessageEmail,
    private sendMessageSms: SendMessageSms,
    private sendMessageInApp: SendMessageInApp,
    private sendMessagePush: SendMessagePush,
    private digest: Digest
  ) {}

  public async execute(command: SendMessageCommand) {
    switch (command.step.template.type) {
      case ChannelTypeEnum.SMS:
        return await this.sendMessageSms.execute(command);
      case ChannelTypeEnum.IN_APP:
        return await this.sendMessageInApp.execute(command);
      case ChannelTypeEnum.EMAIL:
        return await this.sendMessageEmail.execute(command);
      case ChannelTypeEnum.PUSH:
        return await this.sendMessagePush.execute(command);
      case ChannelTypeEnum.DIGEST:
        return await this.digest.execute(command);
    }
  }
}
