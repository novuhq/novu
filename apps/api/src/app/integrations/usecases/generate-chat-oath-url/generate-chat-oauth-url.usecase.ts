import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';
import { GenerateChatOauthUrlCommand } from './generate-chat-oauth-url.command';
import { GenerateSlackOauthUrlCommand } from './generate-slack-oath-url/generate-slack-oauth-url.command';
import { GenerateSlackOauthUrl } from './generate-slack-oath-url/generate-slack-oauth-url.usecase';

@Injectable()
export class GenerateChatOauthUrl {
  constructor(
    private generateSlackOAuthUrl: GenerateSlackOauthUrl,
    private integrationRepository: IntegrationRepository
  ) {}

  async execute(command: GenerateChatOauthUrlCommand): Promise<string> {
    const integration = await this.getIntegration(command);

    switch (integration.providerId) {
      case ChatProviderIdEnum.Slack:
      case ChatProviderIdEnum.Novu:
        return this.generateSlackOAuthUrl.execute(
          GenerateSlackOauthUrlCommand.create({
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            connectionIdentifier: command.connectionIdentifier,
            resource: command.resource,
            integration,
          })
        );

      default:
        throw new BadRequestException(`OAuth not supported for provider: ${integration.providerId}`);
    }
  }

  private async getIntegration(command: GenerateChatOauthUrlCommand): Promise<IntegrationEntity> {
    const integration = await this.integrationRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      channel: ChannelTypeEnum.CHAT,
      providerId: { $in: [ChatProviderIdEnum.Slack, ChatProviderIdEnum.Novu] },
      identifier: command.integrationIdentifier,
    });

    if (!integration) {
      throw new NotFoundException(
        `Integration not found: ${command.integrationIdentifier} in environment ${command.environmentId}`
      );
    }

    return integration;
  }
}
