import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IntegrationEntity } from '@novu/dal';
import { ChatFactory } from './chat/chat.factory';
import { IChatHandler } from './chat/interfaces';
import { IMailHandler } from './mail/interfaces';
import { MailFactory } from './mail/mail.factory';
import { IPushHandler } from './push/interfaces';
import { PushFactory } from './push/push.factory';
import { ISmsHandler } from './sms/interfaces';
import { SmsFactory } from './sms/sms.factory';

export type ChannelHandler = IMailHandler | ISmsHandler | IChatHandler | IPushHandler;

export interface IChannelHandlerOptions {
  from?: string;
}

export interface IChannelFactory {
  getHandler(
    integration: Pick<IntegrationEntity, 'credentials' | 'channel' | 'providerId' | 'configurations'>,
    channelType: 'email' | 'sms' | 'chat' | 'push',
    options?: IChannelHandlerOptions
  ): ChannelHandler;
}

@Injectable()
export class ChannelFactory implements IChannelFactory {
  private readonly mailFactory: MailFactory;
  private readonly smsFactory: SmsFactory;
  private readonly chatFactory: ChatFactory;
  private readonly pushFactory: PushFactory;

  constructor() {
    this.mailFactory = new MailFactory();
    this.smsFactory = new SmsFactory();
    this.chatFactory = new ChatFactory();
    this.pushFactory = new PushFactory();
  }

  // Each getHandler call creates a new provider instance
  getHandler(
    integration: Pick<IntegrationEntity, 'credentials' | 'channel' | 'providerId' | 'configurations'>,
    channelType: 'email' | 'sms' | 'chat' | 'push',
    options: IChannelHandlerOptions = {}
  ): ChannelHandler {
    let handler: ChannelHandler | null = null;

    switch (channelType) {
      case 'email': {
        handler = this.mailFactory.getHandler(integration, options.from);
        break;
      }
      case 'sms': {
        handler = this.smsFactory.getHandler(integration);
        break;
      }
      case 'chat': {
        handler = this.chatFactory.getHandler(integration);
        break;
      }
      case 'push': {
        handler = this.pushFactory.getHandler(integration);
        break;
      }
      default: {
        throw new BadRequestException(`Channel type '${channelType}' is not supported`);
      }
    }

    if (!handler) {
      throw new NotFoundException(
        `Handler for integration provider '${integration.providerId}' in channel '${channelType}' was not found`
      );
    }

    return handler;
  }
}
