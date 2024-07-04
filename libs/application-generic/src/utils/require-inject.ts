import { PlatformException } from './exceptions';
import { Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ChatProviderIdEnum, DigestTypeEnum } from '@novu/shared';
import {
  ChatOutput,
  DelayOutput,
  DigestOutput,
  digestRegularOutput,
  digestTimedOutput,
  EmailOutput,
  InAppOutput,
  PushOutput,
  SmsOutput,
} from '@novu/framework';

export const requireInject = (inject: RequireInject, moduleRef?: ModuleRef) => {
  if (inject === RequireInjectEnum.RESONATE) {
    return initiateResonateProvider(moduleRef);
  } else if (inject === RequireInjectEnum.DO_BRIDGE_REQUEST) {
    return initiateDoBridgeRequestProvider(moduleRef);
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

const initiateDoBridgeRequestProvider = (moduleRef: ModuleRef) => {
  try {
    if (
      process.env.NOVU_ENTERPRISE === 'true' ||
      process.env.CI_EE_TEST === 'true'
    ) {
      if (!require('@novu/ee-echo-worker')?.DoBridgeRequest) {
        throw new PlatformException('Resonate provider is not loaded');
      }

      return moduleRef.get(require('@novu/ee-echo-worker')?.DoBridgeRequest, {
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
      'DoBridgeRequest'
    );
    throw e;
  }
};

type RequireInject = `${RequireInjectEnum}`;

enum RequireInjectEnum {
  RESONATE = 'resonate',
  DO_BRIDGE_REQUEST = 'do_bridge_request',
}

export function getDigestType(outputs: DigestOutput): DigestTypeEnum {
  if (isTimedDigestOutput(outputs)) {
    return DigestTypeEnum.TIMED;
  } else if (isLookBackDigestOutput(outputs)) {
    return DigestTypeEnum.BACKOFF;
  }

  return DigestTypeEnum.REGULAR;
}

export const isTimedDigestOutput = (
  outputs: DigestOutput | undefined
): outputs is digestTimedOutput => {
  return (outputs as digestTimedOutput)?.cron != null;
};

export const isLookBackDigestOutput = (
  outputs: DigestOutput
): outputs is digestRegularOutput => {
  return (
    (outputs as digestRegularOutput)?.lookBackWindow?.amount != null &&
    (outputs as digestRegularOutput)?.lookBackWindow?.unit != null
  );
};

export const isRegularDigestOutput = (
  outputs: DigestOutput
): outputs is digestRegularOutput => {
  return !isTimedDigestOutput(outputs) && !isLookBackDigestOutput(outputs);
};

export type IBridgeChannelResponse =
  | InAppOutput
  | ChatOutput
  | EmailOutput
  | PushOutput
  | SmsOutput;

export type IBridgeActionResponse = DelayOutput | DigestOutput;

export type IBridgeStepResponse =
  | IBridgeChannelResponse
  | IBridgeActionResponse;

export interface IUseCaseInterface<TControl, TResponse> {
  execute: (arg0: TControl) => Promise<TResponse>;
}

export interface IUseCaseInterfaceInline {
  execute: <TControl, TResponse>(arg0: TControl) => Promise<TResponse>;
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

// todo extract option type from framework
export type IProvidersOverride = Record<ChatProviderIdEnum, IProviderOverride>;

// todo extract option type from framework
interface IExecutionOptions {
  skip?: boolean;
}

export type ExecuteOutput<OutputResult> = {
  outputs: OutputResult;
  metadata: ExecuteOutputMetadata;
  providers?: IProvidersOverride;
  options?: IExecutionOptions;
};
