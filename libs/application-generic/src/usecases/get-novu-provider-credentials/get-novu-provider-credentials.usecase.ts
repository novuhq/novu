import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CommunityUserRepository, EnvironmentEntity, OrganizationEntity, UserEntity } from '@novu/dal';
import {
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  FeatureFlagsKeysEnum,
  ICredentials,
  SmsProviderIdEnum,
} from '@novu/shared';
import { FeatureFlagsService } from '../../services';
import { AnalyticsService } from '../../services/analytics.service';
import { CalculateLimitNovuIntegration } from '../calculate-limit-novu-integration';
import { GetNovuProviderCredentialsCommand } from './get-novu-provider-credentials.command';

@Injectable()
export class GetNovuProviderCredentials {
  constructor(
    private analyticsService: AnalyticsService,
    protected calculateLimitNovuIntegration: CalculateLimitNovuIntegration,
    private userRepository: CommunityUserRepository,
    private featureFlagService: FeatureFlagsService
  ) {}

  async execute(integration: GetNovuProviderCredentialsCommand): Promise<ICredentials> {
    if (
      integration.providerId === EmailProviderIdEnum.Novu ||
      integration.providerId === SmsProviderIdEnum.Novu ||
      integration.providerId === ChatProviderIdEnum.Novu
    ) {
      const isTestProviderLimitsEnabled = await this.featureFlagService.getFlag({
        user: { _id: integration.userId } as UserEntity,
        environment: { _id: integration.environmentId } as EnvironmentEntity,
        organization: { _id: integration.organizationId } as OrganizationEntity,
        key: FeatureFlagsKeysEnum.IS_TEST_PROVIDER_LIMITS_ENABLED,
        defaultValue: false,
      });

      if (
        integration.providerId === EmailProviderIdEnum.Novu &&
        integration.recipientEmail &&
        isTestProviderLimitsEnabled
      ) {
        const user = await this.userRepository.findById(integration.userId);

        if (user?.email && user?.email !== integration.recipientEmail) {
          throw new ForbiddenException(
            `Recipient email (${integration.recipientEmail}) does not match the current logged-in user. Novu test provider can only be used to send emails to the current logged-in user. Connect your own email provider to send emails to other addresses.`
          );
        }
      }

      const limit = await this.calculateLimitNovuIntegration.execute({
        channelType: integration.channelType,
        environmentId: integration.environmentId,
        organizationId: integration.organizationId,
      });

      if (!limit) {
        throw new ConflictException(
          `Limit for Novu's ${integration.channelType.toLowerCase()} provider does not exist.`
        );
      }

      if (limit.count >= limit.limit) {
        this.analyticsService.track('[Novu Integration] - Limit reached', integration.userId, {
          channelType: integration.channelType,
          environmentId: integration.environmentId,
          organizationId: integration.organizationId,
          providerId: integration.providerId,
          ...limit,
        });
        throw new ConflictException(`Limit for Novu's ${integration.channelType.toLowerCase()} provider was reached.`);
      }
    }

    if (integration.providerId === EmailProviderIdEnum.Novu) {
      return {
        apiKey: process.env.NOVU_EMAIL_INTEGRATION_API_KEY,
        from: 'no-reply@novu.co',
        senderName: 'Novu',
        ipPoolName: 'Demo',
      };
    }

    if (integration.providerId === SmsProviderIdEnum.Novu) {
      return {
        accountSid: process.env.NOVU_SMS_INTEGRATION_ACCOUNT_SID,
        token: process.env.NOVU_SMS_INTEGRATION_TOKEN,
        from: process.env.NOVU_SMS_INTEGRATION_SENDER,
      };
    }

    if (integration.providerId === ChatProviderIdEnum.Novu) {
      return {
        clientId: process.env.NOVU_SLACK_INTEGRATION_CLIENT_ID,
        secretKey: process.env.NOVU_SLACK_INTEGRATION_CLIENT_SECRET,
      };
    }

    throw new NotFoundException(
      `Credentials for Novu's ${integration.channelType.toLowerCase()} provider could not be found`
    );
  }
}
