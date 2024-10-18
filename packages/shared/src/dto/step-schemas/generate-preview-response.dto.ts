/* eslint-disable */
import { ControlPreviewIssueType } from './control-preview-issue.type';
import { ChannelTypeEnum } from '../../types';

// Base interface for Preview Results
export interface RenderOutput {}

// Chat Preview Result Interface
export interface ChatRenderOutput extends RenderOutput {
  body: string;
}

// SMS Preview Result Interface
export interface SmsRenderOutput extends RenderOutput {
  body: string;
}

// Push Preview Result Interface
export interface PushRenderOutput extends RenderOutput {
  subject: string;
  body: string;
}

// Email Render Result Interface
export interface EmailRenderOutput extends RenderOutput {
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

export interface InAppRenderOutput extends RenderOutput {
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
export interface ControlPreviewIssue {
  issueType: ControlPreviewIssueType; // Enum
  variableName?: string; // Optional
  message: string; // Required
}

// Generate Preview Response DTO Interface
export interface GeneratePreviewResponseDto {
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
