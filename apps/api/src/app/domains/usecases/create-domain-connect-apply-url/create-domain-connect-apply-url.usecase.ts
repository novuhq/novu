import { promises as dnsPromises } from 'node:dns';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { DomainRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { lastValueFrom } from 'rxjs';
import { DomainConnectApplyUrlResponseDto } from '../../dtos/domain-connect-apply-url.dto';
import {
  areProviderSettingsUrlsAllowed,
  buildDomainConnectApplyUrl,
  buildDomainConnectSettingsUrl,
  buildTemplateSupportUrl,
  type DomainConnectProviderSettings,
  getDomainConnectConfig,
  getDomainConnectDiscoveryCandidates,
  getProviderNameForHost,
  isSupportedDomainConnectHost,
  normalizeDomainConnectEndpoint,
} from '../../utils/domain-connect';
import { CreateDomainConnectApplyUrlCommand } from './create-domain-connect-apply-url.command';

interface DomainConnectDiscovery {
  domainName: string;
  providerHost: string;
}

@Injectable()
export class CreateDomainConnectApplyUrl {
  constructor(
    private readonly domainRepository: DomainRepository,
    private readonly httpService: HttpService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: CreateDomainConnectApplyUrlCommand): Promise<DomainConnectApplyUrlResponseDto> {
    const domain = await this.domainRepository.findOneByIdAndEnvironment(
      command.domainId,
      command.environmentId,
      command.organizationId
    );

    if (!domain) {
      throw new NotFoundException(`Domain with id "${command.domainId}" not found.`);
    }

    const isDomainConnectEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_DOMAIN_CONNECT_INBOUND_EMAIL_ENABLED,
      defaultValue: false,
      environment: { _id: command.environmentId },
      organization: { _id: command.organizationId },
      user: { _id: command.userId },
    });

    if (!isDomainConnectEnabled) {
      throw new BadRequestException('Domain Connect auto-configuration is not enabled.');
    }

    const discovery = await this.discoverDomainConnectHost(domain.name);

    if (!discovery || !isSupportedDomainConnectHost(discovery.providerHost)) {
      throw new BadRequestException('Domain Connect auto-configuration is not available for this DNS provider.');
    }

    const settings = await this.fetchProviderSettings(discovery.domainName, discovery.providerHost);

    if (!settings?.urlSyncUX || !areProviderSettingsUrlsAllowed(settings, discovery.providerHost)) {
      throw new BadRequestException('This DNS provider did not return a trusted Domain Connect synchronous flow.');
    }

    const isTemplateSupported = await this.isTemplateSupported(settings);

    if (!isTemplateSupported) {
      throw new BadRequestException('Novu inbound email is not onboarded with this DNS provider yet.');
    }

    try {
      const { applyUrl, redirectUri } = buildDomainConnectApplyUrl({
        domain,
        connectDomainName: discovery.domainName,
        settings,
        discoveredHost: discovery.providerHost,
        redirectUri: command.redirectUri,
      });
      const providerName =
        settings.providerDisplayName ||
        settings.providerName ||
        getProviderNameForHost(discovery.providerHost) ||
        'DNS provider';

      return {
        applyUrl,
        providerName,
        redirectUri,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to build Domain Connect apply URL.';

      throw new BadRequestException(message);
    }
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
