import { ActionTypeEnum, ChannelTypeEnum } from '../../types';
import { SubscriberDto } from '../subscriber';

export class RenderOutput {}

export class ChatRenderOutput extends RenderOutput {
  body: string;
}

export class SmsRenderOutput extends RenderOutput {
  body: string;
}

export class PushRenderOutput extends RenderOutput {
  subject: string;
  body: string;
}

export class EmailRenderOutput extends RenderOutput {
  subject: string;
  body: string;
}

export class DigestOutputProcessor {
  static isDigestRegularOutput(output: unknown): output is DigestRegularOutput {
    if (typeof output !== 'object' || output === null) return false;

    const obj = output as { [key: string]: unknown };

    return typeof obj.amount === 'number' && Object.values(TimeUnitEnum).includes(obj.unit as TimeUnitEnum);
  }

  static isDigestTimedOutput(output: unknown): output is DigestTimedOutput {
    if (typeof output !== 'object' || output === null) return false;

    const obj = output as { [key: string]: unknown };

    return typeof obj.cron === 'string' && (typeof obj.digestKey === 'undefined' || typeof obj.digestKey === 'string');
  }
}

class DigestRegularOutput {
  amount: number;
  unit: TimeUnitEnum;
  digestKey?: string;
  lookBackWindow?: {
    amount: number;
    unit: TimeUnitEnum;
  };
}

class DigestTimedOutput {
  cron: string;
  digestKey?: string;
}

export type DigestRenderOutput = DigestRegularOutput | DigestTimedOutput;

export class DelayRenderOutput extends RenderOutput {
  type: TimeType;
  amount: number;
  unit: TimeUnitEnum;
}
export enum TimeUnitEnum {
  SECONDS = 'seconds',
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
}

type TimeType = 'regular';

export enum RedirectTargetEnum {
  SELF = '_self',
  BLANK = '_blank',
  PARENT = '_parent',
  TOP = '_top',
  UNFENCED_TOP = '_unfencedTop',
}

export class InAppRenderOutput extends RenderOutput {
  subject?: string;
  body: string;
  avatar?: string;
  primaryAction?: {
    label: string;
    redirect?: {
      url: string;
      target?: RedirectTargetEnum;
    };
  };
  secondaryAction?: {
    label: string;
    redirect?: {
      url: string;
      target?: RedirectTargetEnum;
    };
  };
  data?: Record<string, unknown>;
  redirect?: {
    url: string;
    target?: RedirectTargetEnum;
  };
}

export class PreviewPayload {
  subscriber?: Partial<SubscriberDto>;
  payload?: Record<string, unknown>;
  steps?: Record<string, unknown>; // step.stepId.unknown
}

export class GeneratePreviewResponseDto {
  previewPayloadExample: PreviewPayload;
  result:
    | {
        type: ChannelTypeEnum.EMAIL;
        preview: EmailRenderOutput;
      }
    | {
        type: ChannelTypeEnum.IN_APP;
        preview: InAppRenderOutput;
      }
    | {
        type: ChannelTypeEnum.SMS;
        preview: SmsRenderOutput;
      }
    | {
        type: ChannelTypeEnum.PUSH;
        preview: PushRenderOutput;
      }
    | {
        type: ChannelTypeEnum.CHAT;
        preview: ChatRenderOutput;
      }
    | {
        type: ActionTypeEnum.DELAY;
        preview: DigestRenderOutput;
      }
    | {
        type: ActionTypeEnum.DIGEST;
        preview: DigestRenderOutput;
      };
}
