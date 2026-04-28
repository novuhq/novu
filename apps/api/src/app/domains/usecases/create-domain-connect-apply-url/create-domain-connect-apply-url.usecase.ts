import { BadRequestException, Injectable } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { DomainRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { DomainConnectApplyUrlResponseDto } from '../../dtos/domain-connect-apply-url.dto';
import { DomainConnectDiscoveryService } from '../../services/domain-connect-discovery.service';
import {
  areProviderSettingsUrlsAllowed,
  buildDomainConnectApplyUrl,
  getProviderNameForHost,
  isSupportedDomainConnectHost,
} from '../../utils/domain-connect';
import { resolveDomainName } from '../domain-route.utils';
import { CreateDomainConnectApplyUrlCommand } from './create-domain-connect-apply-url.command';

@Injectable()
export class CreateDomainConnectApplyUrl {
  constructor(
    private readonly domainRepository: DomainRepository,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly domainConnectDiscoveryService: DomainConnectDiscoveryService
  ) {}

  async execute(command: CreateDomainConnectApplyUrlCommand): Promise<DomainConnectApplyUrlResponseDto> {
    const domain = await resolveDomainName({
      domainRepository: this.domainRepository,
      domain: command.domain,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

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

    const discovery = await this.domainConnectDiscoveryService.discoverDomainConnectHost(domain.name);

    if (!discovery || !isSupportedDomainConnectHost(discovery.providerHost)) {
      throw new BadRequestException('Domain Connect auto-configuration is not available for this DNS provider.');
    }

    const settings = await this.domainConnectDiscoveryService.fetchProviderSettings(
      discovery.domainName,
      discovery.providerHost
    );

    if (!settings?.urlSyncUX || !areProviderSettingsUrlsAllowed(settings, discovery.providerHost)) {
      throw new BadRequestException('This DNS provider did not return a trusted Domain Connect synchronous flow.');
    }

    const isTemplateSupported = await this.domainConnectDiscoveryService.isTemplateSupported(settings);

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
}
