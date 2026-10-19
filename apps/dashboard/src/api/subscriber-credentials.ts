import { SubscriberResponseDto } from '@novu/api/models/components';
import type { ChatProviderIdEnum, IChannelCredentials, IEnvironment, PushProviderIdEnum } from '@novu/shared';
import { del, patch, put } from './api.client';

export type SubscriberCredentialsProviderId = ChatProviderIdEnum | PushProviderIdEnum;

export type SubscriberCredentialsPayload = Pick<IChannelCredentials, 'webhookUrl' | 'channel' | 'deviceTokens'>;

type UpsertSubscriberCredentialsParams = {
  environment: IEnvironment;
  subscriberId: string;
  providerId: SubscriberCredentialsProviderId;
  credentials: SubscriberCredentialsPayload;
  integrationIdentifier?: string;
  /**
   * 'replace' -> PUT: replaces the stored device tokens with the provided list.
   * 'append'  -> PATCH: appends the provided device tokens to the existing ones.
   */
  mode?: 'replace' | 'append';
};

export async function upsertSubscriberCredentials({
  environment,
  subscriberId,
  providerId,
  credentials,
  integrationIdentifier,
  mode = 'replace',
}: UpsertSubscriberCredentialsParams): Promise<SubscriberResponseDto> {
  const body = {
    providerId,
    credentials,
    ...(integrationIdentifier ? { integrationIdentifier } : {}),
  };
  const endpoint = `/subscribers/${encodeURIComponent(subscriberId)}/credentials`;
  const request = mode === 'append' ? patch : put;
  const { data } = await request<{ data: SubscriberResponseDto }>(endpoint, { environment, body });

  return data;
}

type DeleteSubscriberCredentialsParams = {
  environment: IEnvironment;
  subscriberId: string;
  providerId: SubscriberCredentialsProviderId;
};

export async function deleteSubscriberCredentials({
  environment,
  subscriberId,
  providerId,
}: DeleteSubscriberCredentialsParams): Promise<SubscriberResponseDto> {
  const { data } = await del<{ data: SubscriberResponseDto }>(
    `/subscribers/${encodeURIComponent(subscriberId)}/credentials/${encodeURIComponent(providerId)}`,
    { environment }
  );

  return data;
}
