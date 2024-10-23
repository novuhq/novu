import { ChannelTypeEnum } from '../../types';
import { ControlPreviewIssueTypeEnum } from './control-preview-issue-type.enum';

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
    redirect: {
      url: string;
      target?: RedirectTargetEnum;
    };
  };
  secondaryAction?: {
    label: string;
    redirect: {
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

export class ControlPreviewIssue {
  issueType: ControlPreviewIssueTypeEnum;
  variableName?: string;
  message: string;
}

export class GeneratePreviewResponseDto {
  issues: Record<string, ControlPreviewIssue[]>;
  result?:
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
      };
}
