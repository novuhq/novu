import { BadRequestException, Injectable } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { ChatProviderIdEnum, FeatureFlagsKeysEnum, HumanChannelViaEnum } from '@novu/shared';

type GateScope = { organizationId: string; environmentId: string };

/**
 * Which Agent Inbox channels an organization may use. WhatsApp sits behind
 * `IS_AGENT_INBOX_WHATSAPP_ENABLED`: off means absent from channel lists,
 * invite pages and via validation, not merely hidden.
 */
@Injectable()
export class HumanChannelGate {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  async isWhatsAppEnabled(scope: GateScope): Promise<boolean> {
    return this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_AGENT_INBOX_WHATSAPP_ENABLED,
      defaultValue: false,
      organization: { _id: scope.organizationId },
      environment: { _id: scope.environmentId },
    });
  }

  /** Every via this organization may use, in enum order. */
  async enabledVias(scope: GateScope): Promise<HumanChannelViaEnum[]> {
    const whatsApp = await this.isWhatsAppEnabled(scope);

    return Object.values(HumanChannelViaEnum).filter((via) => whatsApp || via !== HumanChannelViaEnum.WHATSAPP);
  }

  /** Rejects a caller-supplied via the organization may not use, worded like an unknown value. */
  async assertViaEnabled(via: HumanChannelViaEnum | undefined, scope: GateScope): Promise<void> {
    if (via !== HumanChannelViaEnum.WHATSAPP || (await this.isWhatsAppEnabled(scope))) {
      return;
    }

    const allowed = Object.values(HumanChannelViaEnum).filter((value) => value !== HumanChannelViaEnum.WHATSAPP);

    throw new BadRequestException(`Unknown channel "${via}". Use one of: ${allowed.join(', ')}.`);
  }

  /** Drops WhatsApp integrations while the flag is off. Reads the flag only when one is present. */
  async filterIntegrations<T extends { providerId: string }>(integrations: T[], scope: GateScope): Promise<T[]> {
    if (!integrations.some(isWhatsAppIntegration) || (await this.isWhatsAppEnabled(scope))) {
      return integrations;
    }

    return integrations.filter((integration) => !isWhatsAppIntegration(integration));
  }
}

function isWhatsAppIntegration(integration: { providerId: string }): boolean {
  return integration.providerId === ChatProviderIdEnum.WhatsAppBusiness;
}
