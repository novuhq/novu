import { Injectable } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { isKeylessOrganization } from '../../keyless/keyless-organization.helpers';

/**
 * The Agent Inbox features an account has, by its backing organization, so they can be turned on for some
 * accounts before everyone: in LaunchDarkly on cloud, by environment variable elsewhere. The dashboard asks
 * LaunchDarkly itself for the signed-in account; the API answers for an agent's public card, whose visitor isn't
 * signed in and whose organization only the API knows.
 */
@Injectable()
export class AgentInboxFeaturesService {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  /**
   * The onboarding where the operator names their agent and picks its look, connects a host, and the agent then
   * says hi with its card; and that new card on its public page, on Configure and in its link preview. A setup
   * made without an account never has it: it has no onboarding, and its card stays as it was.
   */
  async isNewOnboardingEnabled(organizationId: string): Promise<boolean> {
    if (isKeylessOrganization(organizationId)) {
      return false;
    }

    return this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_AGENT_INBOX_NEW_ONBOARDING_ENABLED,
      defaultValue: false,
      organization: { _id: organizationId },
    });
  }
}
