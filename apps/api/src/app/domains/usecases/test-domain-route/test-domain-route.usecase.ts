import { Injectable } from '@nestjs/common';
import { InboundDomainRouteDelivery, type InboundDomainRouteMailInput } from '@novu/application-generic';
import { DomainRepository, DomainRouteRepository } from '@novu/dal';
import { DomainRouteTypeEnum } from '@novu/shared';
import { nanoid } from 'nanoid';

import { TestDomainRouteResponseDto } from '../../dtos/test-domain-route-response.dto';
import { resolveDomainName } from '../domain-route.utils';
import { TestDomainRouteCommand } from './test-domain-route.command';

@Injectable()
export class TestDomainRoute {
  constructor(
    private readonly domainRepository: DomainRepository,
    private readonly domainRouteRepository: DomainRouteRepository,
    private readonly inboundDomainRouteDelivery: InboundDomainRouteDelivery
  ) {}

  async execute(command: TestDomainRouteCommand): Promise<TestDomainRouteResponseDto> {
    const domain = await resolveDomainName({
      domainRepository: this.domainRepository,
      domain: command.domain,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const routes = await this.domainRouteRepository.findByDomainAndAddresses({
      domainId: domain._id,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      addresses: [command.address, '*'],
    });
    const route = routes.find((r) => r.address === command.address) ?? routes.find((r) => r.address === '*');

    const dryRun = command.dryRun === true;

    const base: TestDomainRouteResponseDto = {
      matched: Boolean(route),
      dryRun,
      domainStatus: domain.status,
      mxRecordConfigured: domain.mxRecordConfigured,
    };

    if (!route) {
      return base;
    }

    const mail = this.buildMail(command, domain.name, route.address);

    if (dryRun) {
      if (route.type === DomainRouteTypeEnum.WEBHOOK) {
        const payload = this.inboundDomainRouteDelivery.buildDomainRouteWebhookPayload(domain, route, mail);

        return {
          ...base,
          matched: true,
          type: DomainRouteTypeEnum.WEBHOOK,
          wouldDeliverTo: 'configured outbound webhooks for this environment',
          payload: payload as unknown as Record<string, unknown>,
        };
      }

      const agentPayload = this.inboundDomainRouteDelivery.previewAgentMailPayload(mail);
      const apiBaseUrl = process.env.API_ROOT_URL ?? '';
      const agentId = route.destination ?? '';
      const wouldDeliverTo =
        apiBaseUrl && agentId
          ? `POST ${apiBaseUrl}/v1/agents/${encodeURIComponent(agentId)}/webhook/<integration>`
          : 'agent webhook (configure API_ROOT_URL for full URL)';

      return {
        ...base,
        matched: true,
        type: DomainRouteTypeEnum.AGENT,
        wouldDeliverTo,
        payload: agentPayload as unknown as Record<string, unknown>,
      };
    }

    if (route.type === DomainRouteTypeEnum.WEBHOOK) {
      const result = await this.inboundDomainRouteDelivery.deliverToWebhook({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        domain,
        route,
        mail,
      });

      return {
        ...base,
        matched: true,
        type: DomainRouteTypeEnum.WEBHOOK,
        webhook: {
          skipped: result.skipped,
          latencyMs: result.latencyMs,
        },
      };
    }

    const toAddress = mail.to[0]?.address ?? `${route.address}@${domain.name}`;
    const agentResult = await this.inboundDomainRouteDelivery.deliverToAgent({
      domain,
      route,
      mail,
      toAddress,
    });

    return {
      ...base,
      matched: true,
      type: DomainRouteTypeEnum.AGENT,
      agent: {
        agentId: route.destination ?? '',
        httpStatus: agentResult.httpStatus,
        agentReply: agentResult.body,
        latencyMs: agentResult.latencyMs,
      },
    };
  }

  private buildMail(
    command: TestDomainRouteCommand,
    domainName: string,
    routeAddress: string
  ): InboundDomainRouteMailInput {
    const toAddress = `${routeAddress}@${domainName}`;
    const messageId = `novu-test-${nanoid(12)}`;

    return {
      from: [{ address: command.from.address, name: command.from.name ?? '' }],
      to: [{ address: toAddress, name: '' }],
      subject: command.subject,
      text: command.text ?? '',
      html: command.html ?? '',
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        from: command.from.address,
        to: toAddress,
        subject: command.subject,
        'message-id': messageId,
        date: new Date().toUTCString(),
        'mime-version': '1.0',
      },
      messageId,
      date: new Date(),
      cc: [],
    };
  }
}
