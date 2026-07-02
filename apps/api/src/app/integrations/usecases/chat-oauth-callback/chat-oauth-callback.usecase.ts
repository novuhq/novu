import { BadRequestException, Injectable } from '@nestjs/common';
import { ChatProviderIdEnum } from '@novu/shared';
import { peekOAuthStatePayload } from '../generate-chat-oath-url/chat-oauth-state.util';
import { ChatOauthCallbackCommand } from './chat-oauth-callback.command';
import { ChatOauthCallbackResult } from './chat-oauth-callback.response';
import { MsTeamsOauthCallbackCommand } from './msteams-oauth-callback/msteams-oauth-callback.command';
import { MsTeamsOauthCallback } from './msteams-oauth-callback/msteams-oauth-callback.usecase';
import { SlackOauthCallbackCommand } from './slack-oauth-callback/slack-oauth-callback.command';
import { SlackOauthCallback } from './slack-oauth-callback/slack-oauth-callback.usecase';

@Injectable()
export class ChatOauthCallback {
  constructor(
    private slackOauthCallback: SlackOauthCallback,
    private msTeamsOauthCallback: MsTeamsOauthCallback
  ) {}

  async execute(command: ChatOauthCallbackCommand): Promise<ChatOauthCallbackResult> {
    const providerId = this.extractProviderIdFromState(command.state);

    switch (providerId) {
      case ChatProviderIdEnum.Slack:
      case ChatProviderIdEnum.Novu:
        if (!command.providerCode) {
          throw new BadRequestException('Missing required parameter: code');
        }

        return await this.slackOauthCallback.execute(
          SlackOauthCallbackCommand.create({
            providerCode: command.providerCode,
            state: command.state,
          })
        );

      case ChatProviderIdEnum.MsTeams:
        return await this.msTeamsOauthCallback.execute(
          MsTeamsOauthCallbackCommand.create({
            tenant: command.tenant,
            adminConsent: command.adminConsent,
            providerCode: command.providerCode,
            state: command.state,
          })
        );

      default:
        throw new BadRequestException(`OAuth callback not supported for provider: ${providerId}`);
    }
  }

  private extractProviderIdFromState(state: string): ChatProviderIdEnum {
    try {
      const preliminaryData = peekOAuthStatePayload<{ providerId?: ChatProviderIdEnum }>(state);

      if (!preliminaryData.providerId) {
        throw new BadRequestException('Invalid state: missing providerId');
      }

      return preliminaryData.providerId;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid OAuth state parameter - cannot extract provider');
    }
  }
}
