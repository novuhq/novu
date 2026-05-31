import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { InboundEmailParseCommand } from './inbound-email-parse.command';
import { InboundParseProcessingError } from './inbound-parse-outcome';
import { LogInboundEmailRequest } from './log-inbound-email-request.usecase';
import { DomainRouteStrategy } from './strategies/domain-route.strategy';
import { ReplyToStrategy } from './strategies/reply-to.strategy';

@Injectable()
export class InboundEmailParse {
  constructor(
    private replyToStrategy: ReplyToStrategy,
    private domainRouteStrategy: DomainRouteStrategy,
    private logInboundEmailRequest: LogInboundEmailRequest,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: InboundEmailParseCommand): Promise<void> {
    const toAddress = command.to[0].address;

    this.logger.info({ toAddress }, 'Received new email to parse');

    const start = Date.now();

    try {
      const outcome = this.isReplyToAddress(toAddress)
        ? await this.replyToStrategy.execute(command)
        : await this.domainRouteStrategy.execute(command);

      // Outcomes are only produced once the recipient resolves to a tenant.
      // Mail dropped before resolution has no org/env to scope a request log to.
      if (outcome) {
        await this.logInboundEmailRequest.execute({ command, outcome, durationMs: Date.now() - start });
      }
    } catch (error) {
      if (error instanceof InboundParseProcessingError && error.outcome) {
        try {
          await this.logInboundEmailRequest.execute({
            command,
            outcome: error.outcome,
            durationMs: Date.now() - start,
          });
        } catch (logError) {
          this.logger.warn(
            { err: logError, transactionId: error.outcome.transactionId },
            'Failed to write inbound-email failure request log'
          );
        }
      }

      throw error;
    }
  }

  private isReplyToAddress(address: string): boolean {
    return address.includes('-nv-e=');
  }
}
