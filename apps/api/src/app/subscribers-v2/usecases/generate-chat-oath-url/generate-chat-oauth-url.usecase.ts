import { BadRequestException, Injectable } from '@nestjs/common';
import { ChatProviderIdEnum } from '@novu/shared';
import { GenerateChatOauthUrlCommand } from './generate-chat-oauth-url.command';
import { GenerateSlackOauthUrl } from './generate-slack-oath-url/generate-slack-oauth-url.usecase';

@Injectable()
export class GenerateChatOauthUrl {
  constructor(private generateSlackOAuthUrl: GenerateSlackOauthUrl) {}

  async execute(command: GenerateChatOauthUrlCommand): Promise<string> {
    switch (command.providerId) {
      case ChatProviderIdEnum.Slack:
      case ChatProviderIdEnum.Novu:
        return this.generateSlackOAuthUrl.execute(command);

      default:
        throw new BadRequestException(`OAuth not supported for provider: ${command.providerId}`);
    }
  }
}
