import { ChatProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ENDPOINT_TYPES,
  IChatOptions,
  IChatProvider,
  ISendMessageSuccessResponse,
  isChannelDataOfType,
} from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

type WebexMessagingProviderConfig = {
  token?: string;
  baseUrl?: string;
};

type WebexMessageResponse = {
  id?: string;
  created?: string;
};

type WebexMessagePayload = {
  roomId?: string;
  parentId?: string;
  toPersonId?: string;
  toPersonEmail?: string;
  text: string;
};

export class WebexMessagingProvider extends BaseProvider implements IChatProvider {
  id = ChatProviderIdEnum.WebexMessaging;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  protected casing = CasingEnum.CAMEL_CASE;

  private static readonly DEFAULT_BASE_URL = 'https://webexapis.com/v1';
  private axiosInstance: AxiosInstance;

  constructor(private config: WebexMessagingProviderConfig = {}) {
    super();

    const normalizedBaseUrl = this.normalizeBaseUrl(config.baseUrl);

    this.axiosInstance = axios.create({
      baseURL: normalizedBaseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const { channelData } = options;
    const { token } = this.config;

    if (!token) {
      throw new Error('Webex Messaging access token is required');
    }

    if (!channelData) {
      throw new Error('Webex Messaging channel data is required');
    }

    const basePayload = this.buildPayload(options);
    const payload = this.transform<Record<string, unknown>, Record<string, unknown>, WebexMessagePayload>(
      bridgeProviderData,
      basePayload
    ).body;

    this.validateDestination(payload);
    this.validateDestinationUnchanged(basePayload, payload);

    try {
      const response = await this.axiosInstance.post<WebexMessageResponse>('/messages', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return {
        id: response.data.id || '',
        date: response.data.created || new Date().toISOString(),
      };
    } catch (error) {
      this.handleWebexError(error);
      throw error;
    }
  }

  private normalizeBaseUrl(baseUrl?: string): string {
    return (baseUrl || WebexMessagingProvider.DEFAULT_BASE_URL).replace(/\/+$/, '');
  }

  private buildPayload(options: IChatOptions): WebexMessagePayload {
    const { channelData, content } = options;

    if (!channelData) {
      throw new Error('Webex Messaging channel data is required');
    }

    if (isChannelDataOfType(channelData, ENDPOINT_TYPES.WEBEX_ROOM)) {
      const { roomId, parentId } = channelData.endpoint;

      if (typeof roomId !== 'string' || roomId.length === 0) {
        throw new Error('Webex room messages require roomId');
      }

      if (parentId !== undefined && (typeof parentId !== 'string' || parentId.length === 0)) {
        throw new Error('Webex threaded room messages require parentId');
      }

      return {
        roomId,
        ...(parentId !== undefined ? { parentId } : {}),
        text: content,
      };
    }

    if (isChannelDataOfType(channelData, ENDPOINT_TYPES.WEBEX_PERSON)) {
      const endpoint = channelData.endpoint as Record<string, unknown>;
      const hasPersonId = Object.prototype.hasOwnProperty.call(endpoint, 'personId');
      const hasPersonEmail = Object.prototype.hasOwnProperty.call(endpoint, 'personEmail');

      if (hasPersonId && hasPersonEmail) {
        throw new Error('Webex person messages require either personId or personEmail, not both');
      }

      if (!hasPersonId && !hasPersonEmail) {
        throw new Error('Webex person messages require personId or personEmail');
      }

      const personId = endpoint.personId;
      const personEmail = endpoint.personEmail;

      if (
        (hasPersonId && (typeof personId !== 'string' || personId.length === 0)) ||
        (hasPersonEmail && (typeof personEmail !== 'string' || personEmail.length === 0))
      ) {
        throw new Error('Webex person messages require personId or personEmail');
      }

      return {
        ...(hasPersonId ? { toPersonId: personId as string } : {}),
        ...(hasPersonEmail ? { toPersonEmail: personEmail as string } : {}),
        text: content,
      };
    }

    throw new Error(`Invalid channel data type for Webex Messaging provider: ${channelData.type}`);
  }

  private validateDestination(payload: Record<string, unknown>): void {
    const destinationKeys = ['roomId', 'toPersonId', 'toPersonEmail'] as const;
    const presentDestinationValues = destinationKeys
      .filter((key) => Object.prototype.hasOwnProperty.call(payload, key))
      .map((key) => payload[key]);

    const hasExactlyOneDestination =
      presentDestinationValues.length === 1 &&
      typeof presentDestinationValues[0] === 'string' &&
      presentDestinationValues[0].length > 0;

    if (!hasExactlyOneDestination) {
      throw new Error('Webex messages require exactly one destination');
    }
  }

  private validateDestinationUnchanged(sourcePayload: WebexMessagePayload, payload: Record<string, unknown>): void {
    const destinationKeys = ['roomId', 'parentId', 'toPersonId', 'toPersonEmail'] as const;
    const changedDestinationKey = destinationKeys.find((key) => {
      const sourceHasKey = Object.prototype.hasOwnProperty.call(sourcePayload, key);
      const payloadHasKey = Object.prototype.hasOwnProperty.call(payload, key);

      return sourceHasKey !== payloadHasKey || payload[key] !== sourcePayload[key];
    });

    if (changedDestinationKey !== undefined) {
      throw new Error('Webex passthrough cannot override message destination');
    }
  }

  private handleWebexError(error: unknown): void {
    if (!axios.isAxiosError(error) || !error.response) {
      return;
    }

    const { status, data, headers } = error.response;
    const message = this.getErrorMessage(data);

    if (status === 401) {
      throw new Error(`WEBEX_INVALID_CREDENTIALS: ${message}`);
    }

    if (status === 403) {
      throw new Error(`WEBEX_INSUFFICIENT_PERMISSIONS: ${message}`);
    }

    if (status === 404) {
      throw new Error(`WEBEX_DESTINATION_NOT_FOUND: ${message}`);
    }

    if (status === 429) {
      const retryAfter = headers?.['retry-after'];

      throw new Error(`WEBEX_RATE_LIMITED: retry after ${retryAfter || 'unknown'} seconds`);
    }

    throw new Error(`Webex Messaging API Error: ${status} - ${message}`);
  }

  private getErrorMessage(data: unknown): string {
    if (this.isRecord(data) && data.message !== undefined) {
      return String(data.message);
    }

    const message = JSON.stringify(data);

    return message === undefined ? '' : message;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
