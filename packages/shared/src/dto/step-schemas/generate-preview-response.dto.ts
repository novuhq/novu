import { ControlPreviewIssueTypeEnum } from './control-preview-issue.type';
import { ChannelTypeEnum } from '../../types';

// Base class for Preview Results
export class RenderOutput {}

// Chat Preview Result Interface
export class ChatRenderOutput extends RenderOutput {
  body: string;
}

// SMS Preview Result Interface
export class SmsRenderOutput extends RenderOutput {
  body: string;
}

// Push Preview Result Interface
export class PushRenderOutput extends RenderOutput {
  subject: string;
  body: string;
}

// Email Render Result Interface
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
  subject: string;
  body: string;
  avatar?: string; // Optional
  primaryAction: {
    label: string;
    redirect: {
      url: string;
      target?: RedirectTargetEnum; // Optional
    };
  };
  secondaryAction?: {
    label: string;
    redirect: {
      url: string;
      target?: RedirectTargetEnum; // Optional
    };
  };
  data?: Record<string, unknown>; // Optional
  redirect: {
    url: string;
    target?: RedirectTargetEnum; // Optional
  };
}

// Control Preview Issue Interface
export class ControlPreviewIssue {
  issueType: ControlPreviewIssueTypeEnum; // Enum
  variableName?: string; // Optional
  message: string; // Required
}

// Generate Preview Response DTO Interface
export class GeneratePreviewResponseDto {
  issues: Record<string, ControlPreviewIssue[]>; // Map of issues
  result?: // Optional
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
