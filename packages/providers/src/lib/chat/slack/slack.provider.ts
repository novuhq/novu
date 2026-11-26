import { ChatProviderIdEnum } from '@novu/shared';
import {
  CardElement,
  ChannelData,
  ChannelTypeEnum,
  ENDPOINT_TYPES,
  IChatFileDeliveryResult,
  IChatOptions,
  IChatProvider,
  IChatRenderResult,
  IChatSendFilesOptions,
  ISendMessageSuccessResponse,
  SlackChannelData,
  SlackUserData,
  WebhookData,
} from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { createProviderHttpClient } from '../../../utils/http';
import { safeChatWebhookJsonRequest } from '../../../utils/safe-chat-webhook-request';
import { WithPassthrough } from '../../../utils/types';
import { omitIncompleteLinkButtons } from '../card-render.utils';
import { dedupeSlackActionIds, toSlackFlavoredCard, validateSlackCard } from './card-render.utils';
import { describeSlackFileError, isSlackUploadUrl, SlackFileApiError } from './slack-files.utils';

type SlackApiResponse<T = Record<string, unknown>> = { ok: boolean; error?: string; needed?: string } & T;

export class SlackProvider extends BaseProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  public id = ChatProviderIdEnum.Slack;
  private slackAPI = 'https://slack.com/api';
  private axiosInstance = createProviderHttpClient();

  /**
   * Rich Chat: serialize a `CardElement` to Slack Block Kit + mrkdwn fallback text.
   */
  async render(card: CardElement): Promise<IChatRenderResult> {
    const { cardToBlockKit, cardToFallbackText } = await import('@chat-adapter/slack');

    // Translate the card's provider-agnostic markdown into Slack mrkdwn (links `<url|label>`,
    // strikethrough `~x~`) before serializing; the adapter only converts `**bold**` on its own.
    // Incomplete Actions (empty URL) stay in the preview card but must not hit Slack.
    const slackCard = toSlackFlavoredCard(omitIncompleteLinkButtons(card));

    return {
      nativePayload: { blocks: dedupeSlackActionIds(cardToBlockKit(slackCard)) },
      content: cardToFallbackText(slackCard),
      validation: validateSlackCard(slackCard),
    };
  }

  async sendMessage(
    data: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const response = await this.sendMessageToEndpoint(data, data.channelData, bridgeProviderData);

    if (data.channelData.type === ENDPOINT_TYPES.WEBHOOK) {
      // Webhooks return plain text "ok" for success
      if (response.data !== 'ok') {
        throw new Error(`Slack Webhook Error`);
      }

      return {
        id: response.headers['x-slack-req-id'] || `webhook-id-${Date.now()}`,
        date: new Date().toISOString(),
      };
    }

    if (!response.data.ok) {
      throw new Error(`Slack API Error: ${response.data.error}`);
    }

    return {
      id: `${response.data.channel}:${response.data.ts}`,
      date: new Date().toISOString(),
      // For a DM this is the `D…` conversation Slack opened for the user id; files are shared there.
      channel: response.data.channel,
    };
  }

  /**
   * Uploads the files with Slack's external upload flow (`files.getUploadURLExternal`, then the
   * bytes, then one `files.completeUploadExternal`), so they show up as one file message right
   * after the notification, in the same channel, DM or thread. Needs the `files:write` scope.
   */
  async sendFiles(options: IChatSendFilesOptions): Promise<IChatFileDeliveryResult[]> {
    const { channelData, files } = options;

    if (channelData.type === ENDPOINT_TYPES.WEBHOOK) {
      return files.map((file) => ({
        name: file.name,
        status: 'skipped',
        reason:
          "Slack incoming webhooks can't carry files. Connect Slack with the Novu Slack app (bot token) to send files.",
      }));
    }

    if (channelData.type !== ENDPOINT_TYPES.SLACK_CHANNEL && channelData.type !== ENDPOINT_TYPES.SLACK_USER) {
      return files.map((file) => ({
        name: file.name,
        status: 'skipped',
        reason: `Slack can't send files to a "${channelData.type}" destination.`,
      }));
    }

    const results = new Map<string, IChatFileDeliveryResult>();
    const uploaded: Array<{ id: string; title: string; key: string }> = [];

    for (const [index, file] of files.entries()) {
      const key = `${index}:${file.name}`;

      if (!file.file || file.file.length === 0) {
        results.set(key, { name: file.name, status: 'skipped', reason: 'The file is empty.' });
        continue;
      }

      try {
        const fileId = await this.uploadFileBytes(channelData.token, file.name, file.file);
        uploaded.push({ id: fileId, title: file.name, key });
      } catch (error) {
        results.set(key, { name: file.name, status: 'failed', reason: this.getFileErrorReason(error) });
      }
    }

    if (uploaded.length > 0) {
      try {
        await this.shareUploadedFiles(options, channelData, uploaded);

        for (const { key, title } of uploaded) {
          results.set(key, { name: title, status: 'sent' });
        }
      } catch (error) {
        const reason = this.getFileErrorReason(error);

        for (const { key, title } of uploaded) {
          results.set(key, { name: title, status: 'failed', reason });
        }
      }
    }

    return files.map((file, index) => results.get(`${index}:${file.name}`) as IChatFileDeliveryResult);
  }

  private async uploadFileBytes(token: string, filename: string, bytes: Buffer): Promise<string> {
    const { data } = await this.axiosInstance.post<SlackApiResponse<{ upload_url?: string; file_id?: string }>>(
      `${this.slackAPI}/files.getUploadURLExternal`,
      new URLSearchParams({ filename, length: String(bytes.length) }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!data.ok || !data.upload_url || !data.file_id) {
      throw new SlackFileApiError(data.error ?? 'missing_upload_url', data.needed);
    }

    // The upload URL comes from Slack's response; never send bytes anywhere else.
    if (!isSlackUploadUrl(data.upload_url)) {
      throw new SlackFileApiError('unexpected_upload_url');
    }

    await this.axiosInstance.post(data.upload_url, bytes, {
      headers: { 'Content-Type': 'application/octet-stream' },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    return data.file_id;
  }

  private async shareUploadedFiles(
    options: IChatSendFilesOptions,
    channelData: SlackChannelData | SlackUserData,
    uploaded: Array<{ id: string; title: string }>
  ): Promise<void> {
    const threadTs = this.getThreadTs(options);
    const target = this.getShareTarget(options, channelData);

    const { data } = await this.axiosInstance.post<SlackApiResponse>(
      `${this.slackAPI}/files.completeUploadExternal`,
      {
        files: uploaded.map(({ id, title }) => ({ id, title })),
        ...target,
        ...(threadTs && { thread_ts: threadTs }),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${channelData.token}`,
        },
      }
    );

    if (!data.ok) {
      throw new SlackFileApiError(data.error ?? 'unknown_error', data.needed);
    }
  }

  /**
   * Share in the conversation the message landed in. `chat.postMessage` to a user id answers with
   * the DM's `D…` id; without it, `channels` accepts the user id directly.
   */
  private getShareTarget(
    options: IChatSendFilesOptions,
    channelData: SlackChannelData | SlackUserData
  ): { channel_id: string } | { channels: string } {
    if (options.sentMessage.channel) {
      return { channel_id: options.sentMessage.channel };
    }

    if (channelData.type === ENDPOINT_TYPES.SLACK_CHANNEL) {
      return { channel_id: channelData.endpoint.channelId };
    }

    return { channels: channelData.endpoint.userId };
  }

  /** The thread the message was posted to, read the same way `sendMessage` built its body. */
  private getThreadTs(options: IChatSendFilesOptions): string | undefined {
    const body = this.transform(options.bridgeProviderData ?? {}, { ...(options.customData || {}) }).body;
    const threadTs = body.thread_ts;

    return typeof threadTs === 'string' && threadTs.length > 0 ? threadTs : undefined;
  }

  private getFileErrorReason(error: unknown): string {
    if (error instanceof SlackFileApiError) {
      return describeSlackFileError(error.code, error.needed);
    }

    const message = error instanceof Error ? error.message : String(error);

    return `Slack file upload failed: ${message}`;
  }

  private sendMessageToEndpoint(
    data: IChatOptions,
    channelData: ChannelData,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ) {
    switch (channelData.type) {
      case ENDPOINT_TYPES.SLACK_CHANNEL:
        return this.sendAppMessageToChannel(data, channelData, bridgeProviderData);
      case ENDPOINT_TYPES.SLACK_USER:
        return this.sendAppMessageToUser(data, channelData, bridgeProviderData);
      case ENDPOINT_TYPES.WEBHOOK:
        return this.sendIncomingWebhookMessage(data, channelData, bridgeProviderData);
      default:
        throw new Error(`Unsupported endpoint format: ${channelData.type}`);
    }
  }

  private async sendAppMessageToChannel(
    data: IChatOptions,
    channelData: SlackChannelData,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ) {
    const { endpoint, token } = channelData;

    const response = await this.axiosInstance.post(
      `${this.slackAPI}/chat.postMessage`,
      this.transform(bridgeProviderData, {
        text: data.content,
        ...data.nativePayload,
        channel: endpoint.channelId,
        ...(data.customData || {}),
      }).body,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response;
  }

  private async sendAppMessageToUser(
    data: IChatOptions,
    channelData: SlackUserData,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ) {
    const { endpoint, token } = channelData;

    const response = await this.axiosInstance.post(
      `${this.slackAPI}/chat.postMessage`,
      this.transform(bridgeProviderData, {
        text: data.content,
        ...data.nativePayload,
        channel: endpoint.userId,
        ...(data.customData || {}),
      }).body,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response;
  }

  private async sendIncomingWebhookMessage(
    data: IChatOptions,
    channelData: WebhookData,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ) {
    const { endpoint } = channelData;

    const response = await safeChatWebhookJsonRequest<string>({
      url: endpoint.url,
      body: this.transform(bridgeProviderData, {
        text: data.content,
        ...data.nativePayload,
        ...(data.customData || {}),
      }).body,
    });

    return {
      data: response.body,
      headers: response.headers,
    };
  }
}
