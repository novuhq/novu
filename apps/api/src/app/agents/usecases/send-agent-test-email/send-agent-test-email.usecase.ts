import * as crypto from 'node:crypto';
import * as net from 'node:net';

import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService, decryptCredentials, InstrumentUsecase, MailFactory } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum, IEmailOptions } from '@novu/shared';

import { trackAgentTestEmailSent } from '../../agent-analytics';
import { SendAgentTestEmailCommand } from './send-agent-test-email.command';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

@Injectable()
export class SendAgentTestEmail {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly analyticsService: AnalyticsService
  ) {}

  @InstrumentUsecase()
  async execute(command: SendAgentTestEmailCommand): Promise<{ success: boolean }> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!agent) {
      throw new NotFoundException(`Agent "${command.agentIdentifier}" not found.`);
    }

    const links = await this.agentIntegrationRepository.findLinksForAgents({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentIds: [agent._id],
    });

    const integrationIds = links.map((l) => l._integrationId).filter(Boolean);
    if (integrationIds.length === 0) {
      throw new BadRequestException('No email integration linked to this agent.');
    }

    const emailIntegration = await this.integrationRepository.findOne({
      _id: { $in: integrationIds } as unknown as string,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      providerId: EmailProviderIdEnum.NovuAgent,
      channel: ChannelTypeEnum.EMAIL,
    });

    if (!emailIntegration) {
      throw new BadRequestException('No Novu Email integration found for this agent.');
    }

    const outboundIntegrationId = emailIntegration.credentials?.outboundIntegrationId as string | undefined;

    const senderIntegration = await this.findSenderIntegration(
      command.environmentId,
      command.organizationId,
      outboundIntegrationId
    );
    const mailFactory = new MailFactory();
    const handler = mailFactory.getHandler(senderIntegration, senderIntegration.credentials?.from as string);

    const escapedName = escapeHtml(agent.name);
    const mailOptions: IEmailOptions = {
      to: [command.targetAddress],
      subject: `Test email for agent "${agent.name}"`,
      html: [
        '<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">',
        '<h2 style="margin: 0 0 12px;">Test Email</h2>',
        `<p style="color: #555; margin: 0 0 16px;">`,
        'This is an automated test email sent to verify the inbound email configuration ',
        `for agent <strong>${escapedName}</strong>.`,
        '</p>',
        '<p style="color: #555; margin: 0;">',
        'If your agent processes this email successfully, the connection test has passed.',
        '</p>',
        '</div>',
      ].join(''),
      from: senderIntegration.credentials?.from as string,
      senderName: (senderIntegration.credentials?.senderName as string) || 'Novu',
    };

    await this.sendToLocalEmailServer(mailOptions).catch((err) => {
      const base = err instanceof Error ? err.message : String(err);

      throw new BadGatewayException({
        error: 'delivery_failed',
        message: base,
      });
    });

    await handler.send(mailOptions).catch((err) => {
      const base = err instanceof Error ? err.message : String(err);
      const body = (err as any)?.response?.body;
      const detail = Array.isArray(body?.errors) ? body.errors[0]?.message : body?.message;
      throw new BadGatewayException({
        error: 'delivery_failed',
        message: detail ? `${base}: ${detail}` : base,
      });
    });

    trackAgentTestEmailSent(this.analyticsService, {
      userId: command.userId,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentIdentifier: command.agentIdentifier,
    });

    return { success: true };
  }

  /**
   * Sends the email directly to a local SMTP server (e.g. Mailhog / MailDev).
   * Mirrors the nodemailer transport used in playground/nextjs/src/pages/api/send-email.ts.
   * Reads SMTP_HOST (default: localhost) and SMTP_PORT (default: 2525) from env vars.
   */
  private sendToLocalEmailServer(mailOptions: IEmailOptions): Promise<void> {
    const host = process.env.SMTP_HOST ?? 'localhost';
    const port = parseInt(process.env.SMTP_PORT ?? '2525', 10);

    const to = Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to];
    const from = mailOptions.from ?? 'no-reply@localhost';

    const crlf = '\r\n';
    const boundary = `boundary_${Date.now()}`;
    const messageId = `<${crypto.randomUUID()}@novu-agent-test>`;
    const rawMessage = [
      `From: ${mailOptions.senderName ? `${mailOptions.senderName} <${from}>` : from}`,
      `To: ${to.join(', ')}`,
      `Subject: ${mailOptions.subject ?? ''}`,
      `Message-ID: ${messageId}`,
      `Date: ${new Date().toUTCString()}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      mailOptions.text ?? '',
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      mailOptions.html ?? '',
      '',
      `--${boundary}--`,
    ].join(crlf);

    return new Promise<void>((resolve, reject) => {
      const socket = net.createConnection({ host, port });
      let buffer = '';
      let step = 0;

      const send = (line: string) => socket.write(`${line}${crlf}`);

      const fail = (reason: string) => {
        socket.destroy();
        reject(new Error(reason));
      };

      socket.setTimeout(10_000);
      socket.on('timeout', () => fail(`SMTP connection to ${host}:${port} timed out`));
      socket.on('error', (err) => reject(err));

      socket.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();

        const lines = buffer.split(crlf);
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const code = parseInt(line.slice(0, 3), 10);

          if (line.startsWith('2') || line.startsWith('3')) {
            // multi-line responses end with <code> (space); skip continuation lines
            if (line[3] === '-') continue;
          }

          switch (step) {
            case 0:
              if (code !== 220) return fail(`Expected 220 greeting, got: ${line}`);
              send(`EHLO localhost`);
              step = 1;
              break;

            case 1:
              if (code !== 250) return fail(`EHLO failed: ${line}`);
              if (line[3] !== '-') {
                send(`MAIL FROM:<${from}>`);
                step = 2;
              }
              break;

            case 2:
              if (code !== 250) return fail(`MAIL FROM rejected: ${line}`);
              send(`RCPT TO:<${to[0]}>`);
              step = 3;
              break;

            case 3:
              if (code !== 250) return fail(`RCPT TO rejected: ${line}`);
              send('DATA');
              step = 4;
              break;

            case 4:
              if (code !== 354) return fail(`DATA not accepted: ${line}`);
              socket.write(`${rawMessage}${crlf}.${crlf}`);
              step = 5;
              break;

            case 5:
              if (code !== 250) return fail(`Message not accepted: ${line}`);
              send('QUIT');
              step = 6;
              break;

            case 6:
              socket.destroy();
              resolve();
              break;

            default:
              break;
          }
        }
      });
    });
  }

  private async findSenderIntegration(environmentId: string, organizationId: string, outboundIntegrationId?: string) {
    if (outboundIntegrationId) {
      const configured = await this.integrationRepository.findOne({
        _id: outboundIntegrationId,
        _environmentId: environmentId,
        _organizationId: organizationId,
        channel: ChannelTypeEnum.EMAIL,
        active: true,
      });

      if (!configured) {
        throw new BadRequestException('Configured outbound integration not found or inactive.');
      }

      if (configured.providerId === EmailProviderIdEnum.Novu) {
        return {
          ...configured,
          credentials: {
            apiKey: process.env.NOVU_EMAIL_INTEGRATION_API_KEY,
            from: 'no-reply@novu.co',
            senderName: 'Novu',
            ipPoolName: 'Demo',
          },
        };
      }

      return { ...configured, credentials: decryptCredentials(configured.credentials ?? {}) };
    }

    const novuDemo = await this.integrationRepository.findOne({
      _environmentId: environmentId,
      _organizationId: organizationId,
      providerId: EmailProviderIdEnum.Novu,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
    });

    if (novuDemo) {
      return {
        ...novuDemo,
        credentials: {
          apiKey: process.env.NOVU_EMAIL_INTEGRATION_API_KEY,
          from: 'no-reply@novu.co',
          senderName: 'Novu',
          ipPoolName: 'Demo',
        },
      };
    }

    const anyEmailProvider = await this.integrationRepository.findOne({
      _environmentId: environmentId,
      _organizationId: organizationId,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      providerId: { $nin: [EmailProviderIdEnum.NovuAgent, EmailProviderIdEnum.Novu] } as unknown as string,
    });

    if (!anyEmailProvider) {
      throw new BadRequestException('No active email provider available to send the test email.');
    }

    return { ...anyEmailProvider, credentials: decryptCredentials(anyEmailProvider.credentials ?? {}) };
  }
}
