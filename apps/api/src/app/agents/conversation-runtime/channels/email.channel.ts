import { BadRequestException, Injectable } from '@nestjs/common';
import { AgentEmailSender, resolveAgentEmailSenderName } from '../../email/agent-email-sender.service';
import { AgentConfigResolver } from '../../services/agent-config-resolver.service';
import type { Channel, ChannelMessage, ChannelReceipt, ChannelTarget } from '../ports/channel.port';

export class EmailChannel implements Channel {
  readonly kind = 'email' as const;

  constructor(
    private readonly target: ChannelTarget,
    private readonly agentEmailSender: AgentEmailSender,
    private readonly agentConfigResolver: AgentConfigResolver
  ) {}

  async post(msg: ChannelMessage): Promise<ChannelReceipt> {
    const config = await this.agentConfigResolver.resolve(this.target.agentId, this.target.integrationIdentifier);
    const sendEmail = this.agentEmailSender.buildSendEmailCallback(config, config.credentials.outboundIntegrationId);
    const senderName = resolveAgentEmailSenderName(config);

    const result = await sendEmail({
      from: `${senderName} <noreply@agent.novu.co>`,
      to: this.target.platformThreadId,
      subject: this.extractSubject(msg),
      html: this.toHtml(msg),
      text: msg.markdown,
    });

    return { messageId: result.messageId ?? '', platformThreadId: this.target.platformThreadId };
  }

  async edit(_messageId: string, _msg: ChannelMessage): Promise<ChannelReceipt> {
    throw new BadRequestException('Email channel does not support editing messages');
  }

  async sendDirect(subscriberId: string, msg: ChannelMessage): Promise<ChannelReceipt> {
    const config = await this.agentConfigResolver.resolve(this.target.agentId, this.target.integrationIdentifier);
    const sendEmail = this.agentEmailSender.buildSendEmailCallback(config, config.credentials.outboundIntegrationId);
    const senderName = resolveAgentEmailSenderName(config);

    const result = await sendEmail({
      from: `${senderName} <noreply@agent.novu.co>`,
      to: subscriberId,
      subject: this.extractSubject(msg),
      html: this.toHtml(msg),
      text: msg.markdown,
    });

    return { messageId: result.messageId ?? '', platformThreadId: undefined };
  }

  private extractSubject(msg: ChannelMessage): string {
    if (msg.card) {
      const title = (msg.card as { title?: string }).title;
      if (title) return title;
    }

    const text = msg.markdown ?? '';
    const firstLine = text.split('\n')[0] ?? '';

    return firstLine.slice(0, 78) || 'New message';
  }

  private toHtml(msg: ChannelMessage): string {
    return msg.markdown ?? '';
  }
}

@Injectable()
export class EmailChannelFactory {
  constructor(
    private readonly agentEmailSender: AgentEmailSender,
    private readonly agentConfigResolver: AgentConfigResolver
  ) {}

  create(target: ChannelTarget): EmailChannel {
    return new EmailChannel(target, this.agentEmailSender, this.agentConfigResolver);
  }
}
