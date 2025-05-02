import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemberRepository, UserEntity, UserRepository } from '@novu/dal';
import {
  EmailProviderIdEnum,
  ICredentials,
  SmsProviderIdEnum,
} from '@novu/shared';
import { AnalyticsService } from '../../services/analytics.service';
import { CalculateLimitNovuIntegration } from '../calculate-limit-novu-integration';

import { GetNovuProviderCredentialsCommand } from './get-novu-provider-credentials.command';

@Injectable()
export class GetNovuProviderCredentials {
  constructor(
    private analyticsService: AnalyticsService,
    protected calculateLimitNovuIntegration: CalculateLimitNovuIntegration,
    private userRepository: UserRepository,
    private memberRepository: MemberRepository,
  ) {}

  async execute(
    integration: GetNovuProviderCredentialsCommand,
  ): Promise<ICredentials> {
    if (
      integration.providerId === EmailProviderIdEnum.Novu ||
      integration.providerId === SmsProviderIdEnum.Novu
    ) {
      if (integration.providerId === EmailProviderIdEnum.Novu && integration.recipientEmail) {
        const members = await this.memberRepository.getOrganizationMembers(integration.organizationId);

        const memberUserIds = members.map((member) => member._userId);
        const memberUsers: UserEntity[] = [];

        for (const member of memberUserIds) {
          const user = await this.userRepository.findById(member);
          memberUsers.push(user);
        }

        const memberEmails = memberUsers.map((user) => user.email).filter((email): email is string => !!email);

        if (!memberEmails.includes(integration.recipientEmail)) {
          throw new ForbiddenException(
            `Recipient email (${integration.recipientEmail}) does not belong to any member of the organization. Novu test provider can only be used to send emails to organization members. Connect your own email provider to send emails to other addresses.`,
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
          `Limit for Novu's ${integration.channelType.toLowerCase()} provider does not exist.`,
        );
      }

      if (limit.count >= limit.limit) {
        this.analyticsService.track(
          '[Novu Integration] - Limit reached',
          integration.userId,
          {
            channelType: integration.channelType,
            environmentId: integration.environmentId,
            organizationId: integration.organizationId,
            providerId: integration.providerId,
            ...limit,
          },
        );
        throw new ConflictException(
          `Limit for Novu's ${integration.channelType.toLowerCase()} provider was reached.`,
        );
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

    throw new NotFoundException(
      `Credentials for Novu's ${integration.channelType.toLowerCase()} provider could not be found`,
    );
  }
}
