import { Injectable } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import type { AgentEntity } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { isKeylessOrganization } from '../../keyless/keyless-organization.helpers';
import type { AgentLookDto } from '../dtos/human-agent-look.dto';
import { agentLookOf } from './agent-look';

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

    return this.areLooksOn(organizationId);
  }

  /**
   * Whether the agents of this organization show their look, and a host that makes one may pick it. It goes with
   * the new onboarding, under the same flag. A setup made without an account is asked about like any account:
   * such setups share one organization, so the flag turns looks on for all of them at once. That is what lets
   * `setup` in a terminal ask for a shape and a colour before there is an account.
   */
  areLooksOn(organizationId: string): Promise<boolean> {
    return this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_AGENT_INBOX_NEW_ONBOARDING_ENABLED,
      defaultValue: false,
      organization: { _id: organizationId },
    });
  }

  /**
   * The look the agent's mascots show wherever they are drawn outside its card: on its channels, and on the pages
   * people open without signing in. It is the agent's own look once looks are on for its organization, and
   * nothing before that, when its mascot is drawn as it always was. Asked each time, so turning the feature on
   * shows at once.
   */
  async mascotLookOf(agent: Pick<AgentEntity, '_organizationId' | 'look'>): Promise<AgentLookDto | null> {
    return (await this.areLooksOn(agent._organizationId)) ? agentLookOf(agent) : null;
  }
}
