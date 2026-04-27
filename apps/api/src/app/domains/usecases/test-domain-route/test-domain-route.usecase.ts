import { Injectable } from '@nestjs/common';
import {
  buildRouteMatchContext,
  evaluateRules,
  InboundDomainRouteDelivery,
  type InboundDomainRouteMailInput,
} from '@novu/application-generic';
import { DomainRepository, type DomainRouteEntity, DomainRouteRepository } from '@novu/dal';
import { DomainRouteMatch, DomainRouteTypeEnum } from '@novu/shared';
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
    const exactRoute = routes.find((r) => r.address === command.address);
    const wildcardRoute = routes.find((r) => r.address === '*');

    const dryRun = command.dryRun === true;

    const base: TestDomainRouteResponseDto = {
      matched: Boolean(exactRoute || wildcardRoute),
      dryRun,
      domainStatus: domain.status,
      mxRecordConfigured: domain.mxRecordConfigured,
    };

    const mail = this.buildMail(command, domain.name);
    const selected = this.selectRoute({ exactRoute, wildcardRoute, domain, mail });
    const route = selected.route;

    if (!route) {
      return {
        ...base,
        matched: false,
        matchEvaluation: selected.matchEvaluation,
      };
    }

    if (dryRun) {
      if (route.type === DomainRouteTypeEnum.WEBHOOK) {
        const payload = this.inboundDomainRouteDelivery.buildDomainRouteWebhookPayload(domain, route, mail);

        return {
          ...base,
          matched: true,
          type: DomainRouteTypeEnum.WEBHOOK,
          wouldDeliverTo: 'configured outbound webhooks for this environment',
          payload: payload as unknown as Record<string, unknown>,
          matchEvaluation: selected.matchEvaluation,
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
        matchEvaluation: selected.matchEvaluation,
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
        matchEvaluation: selected.matchEvaluation,
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
      matchEvaluation: selected.matchEvaluation,
    };
  }

  private selectRoute({
    exactRoute,
    wildcardRoute,
    domain,
    mail,
  }: {
    exactRoute?: DomainRouteEntity;
    wildcardRoute?: DomainRouteEntity;
    domain: Parameters<typeof buildRouteMatchContext>[0];
    mail: InboundDomainRouteMailInput;
  }): {
    route?: DomainRouteEntity;
    matchEvaluation?: TestDomainRouteResponseDto['matchEvaluation'];
  } {
    const exactEvaluation = this.evaluateRouteMatch(exactRoute, domain, mail);
    if (exactEvaluation.passed && exactRoute) {
      return {
        route: exactRoute,
        matchEvaluation: exactEvaluation.matchEvaluation,
      };
    }

    const wildcardEvaluation = this.evaluateRouteMatch(wildcardRoute, domain, mail);
    if (wildcardEvaluation.passed && wildcardRoute) {
      return {
        route: wildcardRoute,
        matchEvaluation: exactEvaluation.matchEvaluation
          ? { ...exactEvaluation.matchEvaluation, fallthroughTo: wildcardRoute.address }
          : wildcardEvaluation.matchEvaluation,
      };
    }

    return {
      matchEvaluation: exactEvaluation.matchEvaluation ?? wildcardEvaluation.matchEvaluation,
    };
  }

  private evaluateRouteMatch(
    route: DomainRouteEntity | undefined,
    domain: Parameters<typeof buildRouteMatchContext>[0],
    mail: InboundDomainRouteMailInput
  ): { passed: boolean; matchEvaluation?: TestDomainRouteResponseDto['matchEvaluation'] } {
    if (!route) {
      return { passed: false };
    }

    if (!route.match) {
      return {
        passed: true,
        matchEvaluation: {
          evaluated: false,
          passed: true,
          matchedRouteAddress: route.address,
        },
      };
    }

    const context = buildRouteMatchContext(domain, route, mail);
    const evaluation = evaluateRules(route.match as DomainRouteMatch, context, true);

    return {
      passed: evaluation.result,
      matchEvaluation: {
        evaluated: true,
        passed: evaluation.result,
        matchedRouteAddress: route.address,
      },
    };
  }

  private buildMail(command: TestDomainRouteCommand, domainName: string): InboundDomainRouteMailInput {
    const toAddress = `${command.address}@${domainName}`;
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
