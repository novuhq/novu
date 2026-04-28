import { Injectable } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { DomainRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import {
  DomainConnectStatusReasonEnum,
  DomainConnectStatusResponseDto,
} from '../../dtos/domain-connect-status-response.dto';
import { DomainConnectDiscoveryService } from '../../services/domain-connect-discovery.service';
import { buildExpectedDnsRecords } from '../../utils/dns-records';
import {
  areProviderSettingsUrlsAllowed,
  getProviderNameForHost,
  hasDomainConnectRuntimeConfig,
  isSupportedDomainConnectHost,
} from '../../utils/domain-connect';
import { resolveDomainName } from '../domain-route.utils';
import { GetDomainConnectStatusCommand } from './get-domain-connect-status.command';

@Injectable()
export class GetDomainConnectStatus {
  constructor(
    private readonly domainRepository: DomainRepository,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly domainConnectDiscoveryService: DomainConnectDiscoveryService
  ) {}

  async execute(command: GetDomainConnectStatusCommand): Promise<DomainConnectStatusResponseDto> {
    const domain = await resolveDomainName({
      domainRepository: this.domainRepository,
      domain: command.domain,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

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
        reasonCode: DomainConnectStatusReasonEnum.DISABLED,
        manualRecords,
      };
    }

    const discovery = await this.domainConnectDiscoveryService.discoverDomainConnectHost(domain.name);

    if (!discovery) {
      return {
        available: false,
        reason: 'Domain Connect discovery is not configured for this DNS provider.',
        reasonCode: DomainConnectStatusReasonEnum.DISCOVERY_NOT_CONFIGURED,
        manualRecords,
      };
    }

    if (!isSupportedDomainConnectHost(discovery.providerHost)) {
      return {
        available: false,
        providerName: getProviderNameForHost(discovery.providerHost),
        reason: 'Domain Connect auto-configuration currently supports Cloudflare and Vercel.',
        reasonCode: DomainConnectStatusReasonEnum.UNSUPPORTED_PROVIDER,
        manualRecords,
      };
    }

    if (!hasDomainConnectRuntimeConfig()) {
      return {
        available: false,
        providerName: getProviderNameForHost(discovery.providerHost),
        reason: 'Domain Connect signing configuration is incomplete.',
        reasonCode: DomainConnectStatusReasonEnum.INCOMPLETE_CONFIGURATION,
        manualRecords,
      };
    }

    const settings = await this.domainConnectDiscoveryService.fetchProviderSettings(
      discovery.domainName,
      discovery.providerHost
    );

    if (!settings) {
      return {
        available: false,
        providerName: getProviderNameForHost(discovery.providerHost),
        reason: 'Failed to retrieve provider settings. Please try manual setup or refresh the status.',
        reasonCode: DomainConnectStatusReasonEnum.PROVIDER_SETTINGS_UNAVAILABLE,
        manualRecords,
      };
    }

    if (!settings.urlSyncUX || !areProviderSettingsUrlsAllowed(settings, discovery.providerHost)) {
      return {
        available: false,
        providerName: getProviderNameForHost(discovery.providerHost),
        reason: 'This DNS provider did not return a trusted synchronous Domain Connect flow.',
        reasonCode: DomainConnectStatusReasonEnum.UNTRUSTED_PROVIDER_FLOW,
        manualRecords,
      };
    }

    const isTemplateSupported = await this.domainConnectDiscoveryService.isTemplateSupported(settings);

    return {
      available: isTemplateSupported,
      providerName:
        settings.providerDisplayName || settings.providerName || getProviderNameForHost(discovery.providerHost),
      providerId: settings.providerId,
      reason: isTemplateSupported ? undefined : 'Novu inbound email is not onboarded with this DNS provider yet.',
      reasonCode: isTemplateSupported ? undefined : DomainConnectStatusReasonEnum.TEMPLATE_NOT_ONBOARDED,
      manualRecords,
    };
  }
}
