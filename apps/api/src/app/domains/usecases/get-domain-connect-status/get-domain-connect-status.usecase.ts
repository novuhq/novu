import { promises as dnsPromises } from 'node:dns';
import { HttpService } from '@nestjs/axios';
import { Injectable, NotFoundException } from '@nestjs/common';
import { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { DomainRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { lastValueFrom } from 'rxjs';
import { DomainConnectStatusResponseDto } from '../../dtos/domain-connect-status-response.dto';
import { buildExpectedDnsRecords } from '../../utils/dns-records';
import {
  areProviderSettingsUrlsAllowed,
  buildDomainConnectSettingsUrl,
  buildTemplateSupportUrl,
  type DomainConnectProviderSettings,
  getDomainConnectConfig,
  getDomainConnectDiscoveryCandidates,
  getProviderNameForHost,
  hasDomainConnectRuntimeConfig,
  isSupportedDomainConnectHost,
  normalizeDomainConnectEndpoint,
} from '../../utils/domain-connect';
import { GetDomainConnectStatusCommand } from './get-domain-connect-status.command';

interface DomainConnectDiscovery {
  domainName: string;
  providerHost: string;
}

@Injectable()
export class GetDomainConnectStatus {
  constructor(
    private readonly domainRepository: DomainRepository,
    private readonly httpService: HttpService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: GetDomainConnectStatusCommand): Promise<DomainConnectStatusResponseDto> {
    const domain = await this.domainRepository.findOneByIdAndEnvironment(
      command.domainId,
      command.environmentId,
      command.organizationId
    );

    if (!domain) {
      throw new NotFoundException(`Domain with id "${command.domainId}" not found.`);
    }

    const manualRecords = buildExpectedDnsRecords(domain.name);

    const isDomainConnectEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_DOMAIN_CONNECT_INBOUND_EMAIL_ENABLED,
      defaultValue: false,
      environment: { _id: command.environmentId },
      organization: { _id: command.organizationId },
      user: { _id: command.userId },
    });

    if (!isDomainConnectEnabled) {
      return {
        available: false,
        reason: 'Domain Connect auto-configuration is not enabled.',
        manualRecords,
      };
    }

    const discovery = await this.discoverDomainConnectHost(domain.name);

    if (!discovery) {
      return {
        available: false,
        reason: 'Domain Connect discovery is not configured for this DNS provider.',
        manualRecords,
      };
    }

    if (!isSupportedDomainConnectHost(discovery.providerHost)) {
      return {
        available: false,
        providerName: getProviderNameForHost(discovery.providerHost),
        reason: 'Domain Connect auto-configuration currently supports Cloudflare and Vercel.',
        manualRecords,
      };
    }

    if (!hasDomainConnectRuntimeConfig()) {
      return {
        available: false,
        providerName: getProviderNameForHost(discovery.providerHost),
        reason: 'Domain Connect signing configuration is incomplete.',
        manualRecords,
      };
    }

    const settings = await this.fetchProviderSettings(discovery.domainName, discovery.providerHost);

    if (!settings?.urlSyncUX || !areProviderSettingsUrlsAllowed(settings, discovery.providerHost)) {
      return {
        available: false,
        providerName: getProviderNameForHost(discovery.providerHost),
        reason: 'This DNS provider did not return a trusted synchronous Domain Connect flow.',
        manualRecords,
      };
    }

    const isTemplateSupported = await this.isTemplateSupported(settings);

    return {
      available: isTemplateSupported,
      providerName:
        settings.providerDisplayName || settings.providerName || getProviderNameForHost(discovery.providerHost),
      providerId: settings.providerId,
      reason: isTemplateSupported ? undefined : 'Novu inbound email is not onboarded with this DNS provider yet.',
      manualRecords,
    };
  }

  private async discoverDomainConnectHost(domainName: string): Promise<DomainConnectDiscovery | undefined> {
    for (const candidate of getDomainConnectDiscoveryCandidates(domainName)) {
      try {
        const records = await dnsPromises.resolveTxt(`_domainconnect.${candidate}`);
        const providerHost = records.map((record) => normalizeDomainConnectEndpoint(record.join(''))).find(Boolean);

        if (providerHost) {
          return { domainName: candidate, providerHost };
        }
      } catch (error) {
        if (isExpectedDiscoveryMiss(error)) {
          this.logger.debug({ domainName: candidate }, 'Domain Connect discovery record was not found');
          continue;
        }

        this.logger.warn({ err: error, domainName: candidate }, 'Failed to discover Domain Connect provider');
      }
    }

    return undefined;
  }

  private async fetchProviderSettings(
    domainName: string,
    discoveredHost: string
  ): Promise<DomainConnectProviderSettings | undefined> {
    try {
      const response = await lastValueFrom(
        this.httpService.get<DomainConnectProviderSettings>(buildDomainConnectSettingsUrl(domainName, discoveredHost), {
          timeout: 5000,
        })
      );

      return response.data;
    } catch (error) {
      this.logger.warn({ err: error, domainName, discoveredHost }, 'Failed to fetch Domain Connect settings');

      return undefined;
    }
  }

  private async isTemplateSupported(settings: DomainConnectProviderSettings): Promise<boolean> {
    const config = getDomainConnectConfig();
    const templateSupportUrl = buildTemplateSupportUrl(settings, config.providerId, config.serviceId);

    if (!templateSupportUrl) {
      return false;
    }

    try {
      await lastValueFrom(this.httpService.get(templateSupportUrl, { maxRedirects: 0, timeout: 5000 }));

      return true;
    } catch (error) {
      this.logger.warn({ err: error, templateSupportUrl }, 'Domain Connect template support check failed');

      return false;
    }
  }
}

function isExpectedDiscoveryMiss(error: unknown): error is NodeJS.ErrnoException {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;

  return code === 'ENOTFOUND' || code === 'ENODATA';
}
