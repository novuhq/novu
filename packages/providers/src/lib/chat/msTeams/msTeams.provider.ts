import { ChatProviderIdEnum } from '@novu/shared';
import {
  CardElement,
  ChannelTypeEnum,
  ENDPOINT_TYPES,
  IChatFile,
  IChatFileDeliveryResult,
  IChatOptions,
  IChatProvider,
  IChatRenderResult,
  IChatSendFilesOptions,
  ISendMessageSuccessResponse,
  isChannelDataOfType,
  MsTeamsChannelData,
  MsTeamsUserData,
} from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { createProviderHttpClient } from '../../../utils/http';
import { safeChatWebhookJsonRequest } from '../../../utils/safe-chat-webhook-request';
import { WithPassthrough } from '../../../utils/types';
import { omitIncompleteLinkButtons } from '../card-render.utils';
import { toTeamsFlavoredCard, validateTeamsCard } from './card-render.utils';
import {
  describeTeamsFileError,
  eTagToUniqueId,
  FILE_INFO_CARD_CONTENT_TYPE,
  getFileType,
  isGuid,
  MAX_SIMPLE_UPLOAD_BYTES,
  TeamsFileError,
  toSafeFileName,
} from './teams-files.utils';

interface CreateConversationResponse {
  id: string;
  serviceUrl?: string;
  activityId?: string;
}

interface DriveItem {
  id: string;
  name: string;
  eTag?: string;
  webUrl?: string;
  webDavUrl?: string;
  parentReference?: { driveId?: string };
}

/** Where a message's files are stored, and the conversation their file cards are posted to. */
interface TeamsFileTarget {
  kind: 'channel' | 'onedrive';
  /** Graph URL of the folder, ending right before the file name: `…/items/{id}:` or `…/root:/{folder}`. */
  folderPath: string;
  conversationId: string;
  activityChannelData?: Record<string, unknown>;
}

const ADAPTIVE_CARD_CONTENT_TYPE = 'application/vnd.microsoft.card.adaptive';
const GRAPH_API_URL = 'https://graph.microsoft.com/v1.0';
/** 1:1 files are stored in the recipient's own OneDrive, in the folder Teams uses for chat files. */
const ONEDRIVE_CHAT_FILES_FOLDER = 'Microsoft Teams Chat Files';

export class MsTeamsProvider extends BaseProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = ChatProviderIdEnum.MsTeams;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  private axiosInstance: AxiosInstance = createProviderHttpClient();

  private static readonly BOT_FRAMEWORK_SERVICE_URL = 'https://smba.trafficmanager.net';

  constructor(private config) {
    super();
  }

  /**
   * Rich Chat: serialize a `CardElement` to a Teams Adaptive Card attachment + fallback text.
   */
  async render(card: CardElement): Promise<IChatRenderResult> {
    const { cardToAdaptiveCard, cardToFallbackText } = await import('@chat-adapter/teams');

    // Teams Adaptive Card TextBlocks render standard markdown for bold/italic/links, but not
    // strikethrough or inline code — strip those markers so they don't show as literal `~~`/backticks.
    // Incomplete Actions (empty URL) stay in the preview card but must not hit Teams.
    const teamsCard = toTeamsFlavoredCard(omitIncompleteLinkButtons(card));

    return {
      nativePayload: {
        attachments: [{ contentType: ADAPTIVE_CARD_CONTENT_TYPE, content: cardToAdaptiveCard(teamsCard) }],
      },
      content: cardToFallbackText(teamsCard),
      validation: validateTeamsCard(teamsCard),
    };
  }

  async sendMessage(
    data: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const { channelData } = data;

    if (!channelData) {
      throw new Error('Channel data is required for MS Teams provider');
    }

    if (isChannelDataOfType(channelData, ENDPOINT_TYPES.WEBHOOK)) {
      return await this.sendWebhookMessage(channelData.endpoint.url, data, bridgeProviderData);
    }

    if (isChannelDataOfType(channelData, ENDPOINT_TYPES.MS_TEAMS_CHANNEL)) {
      return await this.sendChannelMessage(channelData, data);
    }

    if (isChannelDataOfType(channelData, ENDPOINT_TYPES.MS_TEAMS_USER)) {
      return await this.sendUserMessage(channelData, data);
    }

    throw new Error(`Invalid channel data type for MsTeams provider`);
  }

  private async sendWebhookMessage(
    webhookUrl: string,
    data: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>>
  ): Promise<ISendMessageSuccessResponse> {
    let payload: Record<string, unknown>;

    if (data.nativePayload) {
      payload = { type: 'message', ...data.nativePayload };
    } else {
      try {
        payload = { ...JSON.parse(data.content) };
      } catch {
        payload = { text: data.content };
      }
    }

    payload = this.transform(bridgeProviderData, payload).body;

    const response = await safeChatWebhookJsonRequest({
      url: webhookUrl,
      body: payload,
    });

    return {
      id: (response.headers['request-id'] as string) || `webhook-${Date.now()}`,
      date: new Date().toISOString(),
    };
  }

  private async sendChannelMessage(
    channelData: MsTeamsChannelData,
    data: IChatOptions
  ): Promise<ISendMessageSuccessResponse> {
    const { endpoint, subscriberTenantId, token } = channelData;
    const { teamId, channelId } = endpoint;

    const payload = {
      type: 'message',
      ...(data.nativePayload ?? { text: data.content }),
      channelData: {
        tenant: { id: subscriberTenantId },
        team: { id: teamId },
        channel: { id: channelId },
      },
    };

    try {
      const response = await this.axiosInstance.post(
        `${MsTeamsProvider.BOT_FRAMEWORK_SERVICE_URL}/teams/v3/conversations/${encodeURIComponent(channelId)}/activities`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        id: response.data.id || `channel-${Date.now()}`,
        date: new Date().toISOString(),
        // The post's own thread, so its files land as replies under it.
        ...(response.data.id && { channel: `${channelId};messageid=${response.data.id}` }),
      };
    } catch (error) {
      this.handleBotFrameworkError(error);
      throw error;
    }
  }

  private async sendUserMessage(
    channelData: MsTeamsUserData,
    data: IChatOptions
  ): Promise<ISendMessageSuccessResponse> {
    const { endpoint, subscriberTenantId, token, clientId } = channelData;
    const { userId } = endpoint;

    try {
      // Step 1: Create 1:1 conversation
      const conversationPayload = {
        isGroup: false,
        bot: { id: clientId },
        members: [{ id: userId }],
        channelData: {
          tenant: { id: subscriberTenantId },
        },
      };

      const conversationResponse = await this.axiosInstance.post<CreateConversationResponse>(
        `${MsTeamsProvider.BOT_FRAMEWORK_SERVICE_URL}/teams/v3/conversations`,
        conversationPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const conversationId = conversationResponse.data.id;

      // Step 2: Send message to the conversation
      const messagePayload = {
        type: 'message',
        ...(data.nativePayload ?? { text: data.content }),
      };

      const messageResponse = await this.axiosInstance.post(
        `${MsTeamsProvider.BOT_FRAMEWORK_SERVICE_URL}/teams/v3/conversations/${encodeURIComponent(conversationId)}/activities`,
        messagePayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        id: messageResponse.data.id || `user-${Date.now()}`,
        date: new Date().toISOString(),
        channel: conversationId,
      };
    } catch (error) {
      this.handleBotFrameworkError(error);
      throw error;
    }
  }

  /**
   * Stores each file with Microsoft Graph and posts a file card next to the message:
   * - channel: the channel's SharePoint folder (members can already open it), card as a reply to the post;
   * - 1:1 chat: the recipient's OneDrive (they own the file), card in the same chat.
   * Needs the Graph application permission `Files.ReadWrite.All`, granted by the tenant admin.
   */
  async sendFiles(options: IChatSendFilesOptions): Promise<IChatFileDeliveryResult[]> {
    const { channelData, files } = options;
    const all = (status: 'skipped' | 'failed', reason: string): IChatFileDeliveryResult[] =>
      files.map((file) => ({ name: file.name, status, reason }));

    if (isChannelDataOfType(channelData, ENDPOINT_TYPES.WEBHOOK)) {
      return all('skipped', "Teams webhooks can't carry files. Connect the Teams bot to send files.");
    }

    if (
      !isChannelDataOfType(channelData, ENDPOINT_TYPES.MS_TEAMS_CHANNEL) &&
      !isChannelDataOfType(channelData, ENDPOINT_TYPES.MS_TEAMS_USER)
    ) {
      return all('skipped', `Teams can't send files to a "${channelData.type}" destination.`);
    }

    if (!channelData.graphToken) {
      return all('failed', 'No Microsoft Graph access token was available to upload the files.');
    }

    let target: TeamsFileTarget;

    try {
      target = isChannelDataOfType(channelData, ENDPOINT_TYPES.MS_TEAMS_CHANNEL)
        ? await this.getChannelFileTarget(channelData, options.sentMessage)
        : await this.getUserFileTarget(channelData, options.sentMessage);
    } catch (error) {
      return all('failed', describeTeamsFileError(error, this.lookupContext(channelData)));
    }

    const results: IChatFileDeliveryResult[] = [];

    for (const file of files) {
      results.push(await this.sendFile(file, target, channelData));
    }

    return results;
  }

  private lookupContext(channelData: MsTeamsChannelData | MsTeamsUserData) {
    return isChannelDataOfType(channelData, ENDPOINT_TYPES.MS_TEAMS_CHANNEL) ? 'channel-folder' : 'member';
  }

  private async getChannelFileTarget(
    channelData: MsTeamsChannelData,
    sentMessage: ISendMessageSuccessResponse
  ): Promise<TeamsFileTarget> {
    const { endpoint, subscriberTenantId, token, graphToken } = channelData;
    const groupId = isGuid(endpoint.teamId) ? endpoint.teamId : await this.getTeamGroupId(endpoint.teamId, token);

    const { data: folder } = await this.axiosInstance.get<DriveItem>(
      `${GRAPH_API_URL}/teams/${encodeURIComponent(groupId)}/channels/${encodeURIComponent(endpoint.channelId)}/filesFolder`,
      { headers: { Authorization: `Bearer ${graphToken}` } }
    );
    const driveId = folder.parentReference?.driveId;

    if (!driveId || !folder.id) {
      throw new TeamsFileError("Microsoft Graph didn't return the channel's files folder.");
    }

    return {
      kind: 'channel',
      folderPath: `${GRAPH_API_URL}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(folder.id)}:`,
      conversationId: sentMessage.channel ?? endpoint.channelId,
      activityChannelData: {
        tenant: { id: subscriberTenantId },
        team: { id: endpoint.teamId },
        channel: { id: endpoint.channelId },
      },
    };
  }

  private async getUserFileTarget(
    channelData: MsTeamsUserData,
    sentMessage: ISendMessageSuccessResponse
  ): Promise<TeamsFileTarget> {
    const { endpoint, token } = channelData;
    const conversationId = sentMessage.channel ?? (await this.createUserConversation(channelData));
    const userObjectId = isGuid(endpoint.userId)
      ? endpoint.userId
      : await this.getMemberObjectId(conversationId, endpoint.userId, token);

    return {
      kind: 'onedrive',
      folderPath: `${GRAPH_API_URL}/users/${encodeURIComponent(userObjectId)}/drive/root:/${encodeURIComponent(ONEDRIVE_CHAT_FILES_FOLDER)}`,
      conversationId,
    };
  }

  /** Bot Framework's team details carry the Microsoft Entra group id Graph needs (`aadGroupId`). */
  private async getTeamGroupId(teamId: string, token: string): Promise<string> {
    try {
      const { data } = await this.axiosInstance.get<{ aadGroupId?: string }>(
        `${MsTeamsProvider.BOT_FRAMEWORK_SERVICE_URL}/teams/v3/teams/${encodeURIComponent(teamId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!data.aadGroupId) {
        throw new TeamsFileError(`Teams didn't return the Microsoft Entra group id of team ${teamId}.`);
      }

      return data.aadGroupId;
    } catch (error) {
      throw new TeamsFileError(describeTeamsFileError(error, 'team'));
    }
  }

  /** A `29:…` Teams user id is resolved to the Entra object id that addresses their OneDrive. */
  private async getMemberObjectId(conversationId: string, userId: string, token: string): Promise<string> {
    try {
      const { data } = await this.axiosInstance.get<{ aadObjectId?: string }>(
        `${MsTeamsProvider.BOT_FRAMEWORK_SERVICE_URL}/teams/v3/conversations/${encodeURIComponent(conversationId)}/members/${encodeURIComponent(userId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!data.aadObjectId) {
        throw new TeamsFileError(`Teams didn't return the Microsoft Entra object id of user ${userId}.`);
      }

      return data.aadObjectId;
    } catch (error) {
      throw new TeamsFileError(describeTeamsFileError(error, 'member'));
    }
  }

  private async createUserConversation(channelData: MsTeamsUserData): Promise<string> {
    const { data } = await this.axiosInstance.post<CreateConversationResponse>(
      `${MsTeamsProvider.BOT_FRAMEWORK_SERVICE_URL}/teams/v3/conversations`,
      {
        isGroup: false,
        bot: { id: channelData.clientId },
        members: [{ id: channelData.endpoint.userId }],
        channelData: { tenant: { id: channelData.subscriberTenantId } },
      },
      { headers: { Authorization: `Bearer ${channelData.token}`, 'Content-Type': 'application/json' } }
    );

    return data.id;
  }

  private async sendFile(
    file: IChatFile,
    target: TeamsFileTarget,
    channelData: MsTeamsChannelData | MsTeamsUserData
  ): Promise<IChatFileDeliveryResult> {
    if (!file.file || file.file.length === 0) {
      return { name: file.name, status: 'skipped', reason: 'The file is empty.' };
    }

    if (file.file.length > MAX_SIMPLE_UPLOAD_BYTES) {
      return { name: file.name, status: 'skipped', reason: 'The file is larger than 250 MB.' };
    }

    let item: DriveItem;

    try {
      item = await this.uploadFile(file, target, channelData.graphToken as string);
    } catch (error) {
      return {
        name: file.name,
        status: 'failed',
        reason: describeTeamsFileError(error, target.kind === 'channel' ? 'upload' : 'onedrive'),
      };
    }

    const uniqueId = eTagToUniqueId(item.eTag);

    if (item.webDavUrl && uniqueId) {
      try {
        await this.postActivity(target, channelData.token, {
          contentType: FILE_INFO_CARD_CONTENT_TYPE,
          contentUrl: item.webDavUrl,
          name: item.name,
          content: { uniqueId, fileType: getFileType(item.name, file.mime) },
        });

        return { name: file.name, status: 'sent' };
      } catch (error) {
        return await this.sendFileLink(file, item, target, channelData.token, describeTeamsFileError(error, 'post'));
      }
    }

    return await this.sendFileLink(
      file,
      item,
      target,
      channelData.token,
      "Graph didn't return the file's card details"
    );
  }

  /** Graph's upload answer has no `webDavUrl`, which the file card needs, so the item is read back. */
  private async uploadFile(file: IChatFile, target: TeamsFileTarget, graphToken: string): Promise<DriveItem> {
    const fileName = encodeURIComponent(toSafeFileName(file.name));
    const { data: uploaded } = await this.axiosInstance.put<DriveItem>(
      `${target.folderPath}/${fileName}:/content?@microsoft.graph.conflictBehavior=rename`,
      file.file,
      {
        headers: { Authorization: `Bearer ${graphToken}`, 'Content-Type': file.mime || 'application/octet-stream' },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );
    const driveId = uploaded.parentReference?.driveId;

    if (!driveId) {
      return uploaded;
    }

    const { data: item } = await this.axiosInstance.get<DriveItem>(
      `${GRAPH_API_URL}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(uploaded.id)}?$select=id,name,eTag,webUrl,webDavUrl`,
      { headers: { Authorization: `Bearer ${graphToken}` } }
    );

    return { ...uploaded, ...item };
  }

  /** When Teams won't show a file card, the uploaded file is still shared as a link. */
  private async sendFileLink(
    file: IChatFile,
    item: DriveItem,
    target: TeamsFileTarget,
    botToken: string,
    cardProblem: string
  ): Promise<IChatFileDeliveryResult> {
    if (!item.webUrl) {
      return { name: file.name, status: 'failed', reason: `Uploaded, but couldn't post it: ${cardProblem}.` };
    }

    try {
      await this.postActivity(target, botToken, {
        contentType: ADAPTIVE_CARD_CONTENT_TYPE,
        content: {
          type: 'AdaptiveCard',
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          version: '1.4',
          body: [{ type: 'TextBlock', text: item.name, wrap: true, weight: 'Bolder' }],
          actions: [{ type: 'Action.OpenUrl', title: 'Open file', url: item.webUrl }],
        },
      });

      return {
        name: file.name,
        status: 'sent',
        reason: `Sent as a link, because Teams didn't show the file card: ${cardProblem}`,
      };
    } catch (error) {
      return {
        name: file.name,
        status: 'failed',
        reason: `Uploaded, but couldn't post it: ${describeTeamsFileError(error, 'post')}`,
      };
    }
  }

  private async postActivity(target: TeamsFileTarget, botToken: string, attachment: Record<string, unknown>) {
    await this.axiosInstance.post(
      `${MsTeamsProvider.BOT_FRAMEWORK_SERVICE_URL}/teams/v3/conversations/${encodeURIComponent(target.conversationId)}/activities`,
      {
        type: 'message',
        attachments: [attachment],
        ...(target.activityChannelData && { channelData: target.activityChannelData }),
      },
      { headers: { Authorization: `Bearer ${botToken}`, 'Content-Type': 'application/json' } }
    );
  }

  private handleBotFrameworkError(error: unknown): void {
    if (!axios.isAxiosError(error) || !error.response) {
      return;
    }

    const status = error.response.status;
    const data = error.response.data;
    const errorCode = data?.error?.code || '';
    const errorMessage = data?.error?.message || data?.message || '';

    // Map Bot Framework errors to descriptive messages
    if (
      errorCode === 'BotNotInConversationRoster' ||
      errorMessage.includes('BotNotInConversationRoster') ||
      errorMessage.includes('Bot is not installed in user') ||
      errorMessage.toLowerCase().includes('not installed')
    ) {
      throw new Error('MSTEAMS_BOT_NOT_INSTALLED: Bot is not installed in this team/channel or for this user');
    }

    if (status === 404) {
      throw new Error('MSTEAMS_CHANNEL_NOT_FOUND: Teams channel or user not found');
    }

    if (status === 401) {
      throw new Error('MSTEAMS_INVALID_CREDENTIALS: Invalid bot credentials or token');
    }

    if (status === 403) {
      throw new Error('MSTEAMS_INSUFFICIENT_PERMISSIONS: Insufficient permissions to send message');
    }

    // Generic error
    throw new Error(`MS Teams API Error: ${status} - ${errorMessage || JSON.stringify(data)}`);
  }
}
