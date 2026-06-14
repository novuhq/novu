import axios, { AxiosInstance } from 'axios';
import { ChatProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ENDPOINT_TYPES,
  IChatOptions,
  IChatProvider,
  ISendMessageSuccessResponse,
  isChannelDataOfType,
} from '@novu/stateless';
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

    const payload = this.transform<Record<string, unknown>, Record<string, unknown>, WebexMessagePayload>(
      bridgeProviderData,
      this.buildPayload(options)
    ).body;

    this.validateDestination(payload);

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

      if (!roomId) {
        throw new Error('Webex room messages require roomId');
      }

      return {
        roomId,
        ...(parentId !== undefined ? { parentId } : {}),
        text: content,
      };
    }

    if (isChannelDataOfType(channelData, ENDPOINT_TYPES.WEBEX_PERSON)) {
      const { personId, personEmail } = channelData.endpoint;

      if (personId && personEmail) {
        throw new Error('Webex person messages require either personId or personEmail, not both');
      }

      if (!personId && !personEmail) {
        throw new Error('Webex person messages require personId or personEmail');
      }

      return {
        ...(personId ? { toPersonId: personId } : {}),
        ...(personEmail ? { toPersonEmail: personEmail } : {}),
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
