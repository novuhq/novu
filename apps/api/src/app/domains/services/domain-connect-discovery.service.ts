import { promises as dnsPromises } from 'node:dns';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { lastValueFrom } from 'rxjs';
import {
  buildDomainConnectSettingsUrl,
  buildTemplateSupportUrl,
  type DomainConnectProviderSettings,
  getDomainConnectConfig,
  getDomainConnectDiscoveryCandidates,
  normalizeDomainConnectEndpoint,
} from '../utils/domain-connect';

export interface DomainConnectDiscovery {
  domainName: string;
  providerHost: string;
}

@Injectable()
export class DomainConnectDiscoveryService {
  constructor(
    private readonly httpService: HttpService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async discoverDomainConnectHost(domainName: string): Promise<DomainConnectDiscovery | undefined> {
    for (const candidate of getDomainConnectDiscoveryCandidates(domainName)) {
      try {
        const records = await dnsPromises.resolveTxt(`_domainconnect.${candidate}`);
        const providerHost = records.map((record) => normalizeDomainConnectEndpoint(record.join(''))).find(Boolean);

        if (providerHost) {
          return { domainName: candidate, providerHost };
        }
      } catch (error) {
        if (this.isExpectedDiscoveryMiss(error)) {
          this.logger.debug({ domainName: candidate }, 'Domain Connect discovery record was not found');
          continue;
        }

        this.logger.warn({ err: error, domainName: candidate }, 'Failed to discover Domain Connect provider');
      }
    }

    return undefined;
  }

  async fetchProviderSettings(
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

  async isTemplateSupported(settings: DomainConnectProviderSettings): Promise<boolean> {
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

  private isExpectedDiscoveryMiss(error: unknown): error is NodeJS.ErrnoException {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;

    return code === 'ENOTFOUND' || code === 'ENODATA';
  }
}
