import { PlatformException } from './exceptions';
import { Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ChatProviderIdEnum } from '@novu/shared';

export const requireInject = (inject: RequireInject, moduleRef?: ModuleRef) => {
  if (inject === RequireInjectEnum.RESONATE) {
    return initiateResonateProvider(moduleRef);
  }
};

const initiateResonateProvider = (moduleRef: ModuleRef) => {
  try {
    if (
      process.env.NOVU_ENTERPRISE === 'true' ||
      process.env.CI_EE_TEST === 'true'
    ) {
      if (!require('@novu/ee-echo-worker')?.Resonate) {
        throw new PlatformException('Resonate provider is not loaded');
      }

      return moduleRef.get(require('@novu/ee-echo-worker')?.Resonate, {
        strict: false,
      });
    } else {
      return {
        execute: () => {
          return null;
        },
      };
    }
  } catch (e) {
    Logger.error(
      e,
      `Unexpected error while importing enterprise modules`,
      'Resonate'
    );
    throw e;
  }
};

type RequireInject = `${RequireInjectEnum}`;

enum RequireInjectEnum {
  RESONATE = 'resonate',
}

export interface IBridgeDigestResponse {
  amount: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  type: 'regular';
  backoff: boolean;
  digestKey: string;
}

export interface IBridgeDelayResponse {
  amount: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  type: 'regular';
}

export interface IBridgeInAppResponse {
  body: string;
}

export interface IBridgeChatResponse {
  body: string;
}

export interface IBridgeEmailResponse {
  subject: string;
  body: string;
}

export interface IBridgePushResponse {
  subject: string;
  body: string;
}

export interface IBridgeSmsResponse {
  body: string;
}

export type IBridgeChannelResponse =
  | IBridgeInAppResponse
  | IBridgeChatResponse
  | IBridgeEmailResponse
  | IBridgePushResponse
  | IBridgeSmsResponse;

export type IBridgeActionResponse =
  | IBridgeDelayResponse
  | IBridgeDigestResponse;

export type IBridgeStepResponse =
  | IBridgeChannelResponse
  | IBridgeActionResponse;

export interface IUseCaseInterface<TInput, TResponse> {
  execute: (arg0: TInput) => TResponse;
}

export interface IUseCaseInterfaceInline {
  execute: <TInput, TResponse>(arg0: TInput) => Promise<TResponse>;
}

export type ExecuteOutputMetadata = {
  status: string;
  error: boolean;
  /**
   * The duration of the step in milliseconds
   */
  duration: number;
};

enum BlocksTypeEnum {
  SECTION = 'section',
  SECTION1 = 'header',
}

enum TextTypeEnum {
  MARKDOWN = 'mrkdwn',
}

export interface IProviderOverride {
  webhookUrl: string;
  text: string;
  blocks: IBlock[];
}

export interface IBlock {
  type: `${BlocksTypeEnum}`;
  text: {
    type: `${TextTypeEnum}`;
    text: string;
  };
}

export type IProvidersOverride = Record<ChatProviderIdEnum, IProviderOverride>;

interface IExecutionOptions {
  skip?: boolean;
}

export type ExecuteOutput<OutputResult> = {
  outputs: OutputResult;
  metadata: ExecuteOutputMetadata;
  providers?: IProvidersOverride;
  options?: IExecutionOptions;
};
