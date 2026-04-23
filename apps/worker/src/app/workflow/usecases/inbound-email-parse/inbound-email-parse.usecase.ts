import { Injectable, Logger } from '@nestjs/common';
import { InboundEmailParseCommand } from './inbound-email-parse.command';
import { DomainRouteStrategy } from './strategies/domain-route.strategy';
import { ReplyToStrategy } from './strategies/reply-to.strategy';

const LOG_CONTEXT = 'InboundEmailParse';

@Injectable()
export class InboundEmailParse {
  constructor(
    private replyToStrategy: ReplyToStrategy,
    private domainRouteStrategy: DomainRouteStrategy
  ) {}

  async execute(command: InboundEmailParseCommand): Promise<void> {
    const toAddress = command.to[0].address;

    Logger.log({ toAddress }, 'Received new email to parse', LOG_CONTEXT);

    if (this.isReplyToAddress(toAddress)) {
      return this.replyToStrategy.execute(command);
    }

    return this.domainRouteStrategy.execute(command);
  }

  private isReplyToAddress(address: string): boolean {
    return address.includes('-nv-e=');
  }
}
