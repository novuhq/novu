import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';
import { Bell, Chat, DigestGradient, Mail, Mobile, Sms, TimerGradient } from '@novu/design-system';

export enum TemplateAnalyticsEnum {
  CREATE_TEMPLATE_CLICK = 'Create Template Click - [Templates]',
  TRY_DIGEST_CLICK = 'Try Digest Click - [Templates]',
}

export enum TemplateEditorAnalyticsEnum {
  CONFIGURE_PROVIDER_BANNER_CLICK = 'Configure Provider Banner Click - [Template Editor]',
  CONFIGURE_PRIMARY_PROVIDER_BANNER_CLICK = 'Configure Primary Provider Banner Click - [Template Editor]',
  CONFIGURE_PROVIDER_POPOVER_CLICK = 'Configure Provider Popover Click - [Template Editor]',
}

export enum DigestPlaygroundAnalyticsEnum {
  BACK_BUTTON_CLICK = 'Back Button Click - [Digest Playground]',
  SETUP_DIGEST_WORKFLOW_CLICK = 'Set Up Digest Workflow Click - [Digest Playground]',
  LEARN_MORE_IN_DOCS_CLICK = 'Learn More In Docs Click - [Digest Playground]',
  RUN_TRIGGER_CLICK = 'Run Trigger Click - [Digest Playground]',
  DIGEST_INTERVAL_CHANGE = 'Digest Interval Change - [Digest Playground]',
}

export enum DigestWorkflowTourAnalyticsEnum {
  FIRST_HINT_NEXT_CLICK = 'First Hint Next Click - [Digest Workflow Tour]',
  SECOND_HINT_NEXT_CLICK = 'Second Hint Next Click - [Digest Workflow Tour]',
  THIRD_HINT_GOT_IT_CLICK = 'Third Hint Got It Click - [Digest Workflow Tour]',
  HINT_SKIP_TOUR_CLICK = 'Hint Skip Tour Click - [Digest Workflow Tour]',
  NAVIGATE_HINT_CLICK = 'Navigate Hint Click - [Digest Workflow Tour]',
}

export const HINT_INDEX_TO_CLICK_ANALYTICS = {
  0: DigestWorkflowTourAnalyticsEnum.FIRST_HINT_NEXT_CLICK,
  1: DigestWorkflowTourAnalyticsEnum.SECOND_HINT_NEXT_CLICK,
  2: DigestWorkflowTourAnalyticsEnum.THIRD_HINT_GOT_IT_CLICK,
};

export const ordinalNumbers = {
  1: 'first',
  2: 'second',
  3: 'third',
  4: 'fourth',
  5: 'fifth',
  6: 'sixth',
  7: 'seventh',
  8: 'eighth',
  9: 'ninth',
  10: 'tenth',
};

export const stepNames: Record<StepTypeEnum | ChannelTypeEnum, string> = {
  email: 'Email',
  chat: 'Chat',
  in_app: 'In-App',
  sms: 'SMS',
  push: 'Push',
  digest: 'Digest',
  delay: 'Delay',
  trigger: 'Trigger',
};

export const stepIcon: Record<StepTypeEnum | ChannelTypeEnum, (...args: any[]) => JSX.Element> = {
  email: Mail,
  chat: Chat,
  in_app: Bell,
  sms: Sms,
  push: Mobile,
  digest: DigestGradient,
  delay: TimerGradient,
  trigger: () => <></>,
};

export enum StartFromScratchTourAnalyticsEnum {
  FIRST_HINT_NEXT_CLICK = 'First Hint Next Click - [Start From Scratch Tour]',
  SECOND_HINT_NEXT_CLICK = 'Second Hint Next Click - [Start From Scratch Tour]',
  THIRD_HINT_NEXT_CLICK = 'Third Hint Next Click - [Start From Scratch Tour]',
  FOURTH_HINT_NEXT_CLICK = 'Fourth Hint Next Click - [Start From Scratch Tour]',
  FIFTH_HINT_GOT_IT_CLICK = 'Fifth Hint Got It Click - [Start From Scratch Tour]',
  WATCH_LATER_TOUR_CLICK = 'Watch Later Tour Click - [Start From Scratch Tour]',
}

export const SCRATCH_HINT_INDEX_TO_CLICK_ANALYTICS = {
  0: StartFromScratchTourAnalyticsEnum.FIRST_HINT_NEXT_CLICK,
  1: StartFromScratchTourAnalyticsEnum.SECOND_HINT_NEXT_CLICK,
  2: StartFromScratchTourAnalyticsEnum.THIRD_HINT_NEXT_CLICK,
  3: StartFromScratchTourAnalyticsEnum.FOURTH_HINT_NEXT_CLICK,
  4: StartFromScratchTourAnalyticsEnum.FIFTH_HINT_GOT_IT_CLICK,
};
