import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { InboundEmailParseCommand } from './inbound-email-parse.command';
import { DomainRouteStrategy } from './strategies/domain-route.strategy';
import { ReplyToStrategy } from './strategies/reply-to.strategy';

@Injectable()
export class InboundEmailParse {
  constructor(
    private replyToStrategy: ReplyToStrategy,
    private domainRouteStrategy: DomainRouteStrategy,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: InboundEmailParseCommand): Promise<void> {
    const toAddress = command.to[0].address;

    this.logger.info({ toAddress }, 'Received new email to parse');

    if (this.isReplyToAddress(toAddress)) {
      return this.replyToStrategy.execute(command);
    }

    return this.domainRouteStrategy.execute(command);
  }

  private isReplyToAddress(address: string): boolean {
    return address.includes('-nv-e=');
  }
}
