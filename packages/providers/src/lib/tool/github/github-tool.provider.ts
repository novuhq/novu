import { ToolProviderIdEnum } from '@novu/shared';
import { safeOutboundJsonRequest } from '@novu/shared/utils/safe-outbound-http';
import { ChannelTypeEnum, ISendMessageSuccessResponse, IToolOptions, IToolProvider } from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class GithubToolProvider extends BaseProvider implements IToolProvider {
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  readonly id = ToolProviderIdEnum.GitHub;
  channelType = ChannelTypeEnum.TOOL as ChannelTypeEnum.TOOL;

  constructor(
    private config: {
      token: string;
      owner: string;
      repo: string;
      eventType: string;
    }
  ) {
    super();
  }

  async sendMessage(
    options: IToolOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const data = this.transform(bridgeProviderData, {
      content: options.content,
      ...(options.customData || {}),
    });

    const owner = (data.body.owner as string) || this.config.owner;
    const repo = (data.body.repo as string) || this.config.repo;
    const eventType = (data.body.event_type as string) || (data.body.eventType as string) || this.config.eventType;
    const token = (data.body.token as string) || this.config.token;

    for (const key of ['owner', 'repo', 'event_type', 'eventType', 'token']) {
      if (key in data.body) {
        delete data.body[key];
      }
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/dispatches`;
    const body = JSON.stringify({
      event_type: eventType,
      client_payload: data.body,
    });

    await safeOutboundJsonRequest({
      url,
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body,
    });

    return {
      date: new Date().toDateString(),
    };
  }
}
