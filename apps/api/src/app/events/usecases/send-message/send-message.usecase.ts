import { Injectable } from '@nestjs/common';
import { ChannelTypeEnum } from '@novu/shared';
import { SendMessageCommand } from './send-message.command';
import { SendMessageEmail } from './send-message-email.usecase';
import { SendMessageSms } from './send-message-sms.usecase';
import { SendMessageInApp } from './send-message-in-app.usecase';
import { SendMessageDirect } from './send-message-direct.usecase';
import { SendMessagePush } from './send-message-push.usecase';

@Injectable()
export class SendMessage {
  constructor(
    private sendMessageEmail: SendMessageEmail,
    private sendMessageSms: SendMessageSms,
    private sendMessageInApp: SendMessageInApp,
    private sendMessageDirect: SendMessageDirect,
    private sendMessagePush: SendMessagePush
  ) {}

  public async execute(command: SendMessageCommand) {
    switch (command.step.template.type) {
      case ChannelTypeEnum.SMS:
        return await this.sendMessageSms.execute(command);
      case ChannelTypeEnum.IN_APP:
        return await this.sendMessageInApp.execute(command);
      case ChannelTypeEnum.EMAIL:
        return await this.sendMessageEmail.execute(command);
      case ChannelTypeEnum.DIRECT:
        return await this.sendMessageDirect.execute(command);
      case ChannelTypeEnum.PUSH:
        return await this.sendMessagePush.execute(command);
    }
  }
}
