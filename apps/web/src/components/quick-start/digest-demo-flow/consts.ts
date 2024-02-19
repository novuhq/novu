import { UTM_CAMPAIGN_QUERY_PARAM } from '@novu/shared';

export enum GuideTitleEnum {
  TRIGGER_PREVIEW = 'Trigger',
  TRIGGER_PLAYGROUND = 'Run trigger multiple times',
  DIGEST_PREVIEW = 'Digest',
  DIGEST_PLAYGROUND = 'Set-up any time interval ',
  CHANNELS_PREVIEW = 'Channels',
  CHANNELS_PLAYGROUND = 'It’s time to check your email',
}
export interface IGuide {
  title: GuideTitleEnum;
  description: string;
  docsUrl?: string;
  sequence: Record<number, IBeat>;
}

export interface IBeat {
  open: boolean;
  opacity: number;
}

export const HINT_HIDDEN_OPACITY = 0;
export const HINT_MIDDLE_OPACITY = 0.4;
export const HINT_VISIBLE_OPACITY = 1;

export const guidePreview: Record<string, IGuide> = {
  trigger: {
    title: GuideTitleEnum.TRIGGER_PREVIEW,
    description: 'Use the server SDK in your app for a specific trigger. ',
    docsUrl: `https://docs.novu.co/api-reference/events/trigger-event${UTM_CAMPAIGN_QUERY_PARAM}`,
    sequence: {
      1: { open: false, opacity: HINT_HIDDEN_OPACITY },
      2: { open: true, opacity: HINT_VISIBLE_OPACITY },
      3: { open: true, opacity: HINT_MIDDLE_OPACITY },
      4: { open: true, opacity: HINT_MIDDLE_OPACITY },
      5: { open: true, opacity: HINT_MIDDLE_OPACITY },
    },
  },
  digest: {
    title: GuideTitleEnum.DIGEST_PREVIEW,
    description: 'Aggregates multiple events into a precise notification. ',
    docsUrl: `https://docs.novu.co/workflows/digest${UTM_CAMPAIGN_QUERY_PARAM}`,
    sequence: {
      1: { open: false, opacity: HINT_HIDDEN_OPACITY },
      2: { open: false, opacity: HINT_HIDDEN_OPACITY },
      3: { open: true, opacity: HINT_VISIBLE_OPACITY },
      4: { open: true, opacity: HINT_MIDDLE_OPACITY },
      5: { open: true, opacity: HINT_VISIBLE_OPACITY },
    },
  },
  email: {
    title: GuideTitleEnum.CHANNELS_PREVIEW,
    description: 'Build desired order of channels. ',
    docsUrl: `https://docs.novu.co/channels-and-providers/integration-store${UTM_CAMPAIGN_QUERY_PARAM}`,
    sequence: {
      1: { open: false, opacity: HINT_HIDDEN_OPACITY },
      2: { open: false, opacity: HINT_HIDDEN_OPACITY },
      3: { open: false, opacity: HINT_HIDDEN_OPACITY },
      4: { open: true, opacity: HINT_VISIBLE_OPACITY },
      5: { open: true, opacity: HINT_MIDDLE_OPACITY },
    },
  },
};

export const guidePlayground: Record<string, IGuide> = {
  trigger: {
    title: GuideTitleEnum.TRIGGER_PLAYGROUND,
    description: 'Once the event is triggered, the app sends it to digest',
    sequence: {
      1: { open: false, opacity: HINT_HIDDEN_OPACITY },
      2: { open: true, opacity: HINT_VISIBLE_OPACITY },
      3: { open: true, opacity: HINT_MIDDLE_OPACITY },
      4: { open: true, opacity: HINT_MIDDLE_OPACITY },
      5: { open: true, opacity: HINT_MIDDLE_OPACITY },
    },
  },
  digest: {
    title: GuideTitleEnum.DIGEST_PLAYGROUND,
    description: 'Digest engine aggregates multiple events and... ',
    sequence: {
      1: { open: false, opacity: HINT_HIDDEN_OPACITY },
      2: { open: false, opacity: HINT_HIDDEN_OPACITY },
      3: { open: true, opacity: HINT_VISIBLE_OPACITY },
      4: { open: true, opacity: HINT_MIDDLE_OPACITY },
      5: { open: true, opacity: HINT_VISIBLE_OPACITY },
    },
  },
  email: {
    title: GuideTitleEnum.CHANNELS_PLAYGROUND,
    description: 'As soon as the specified time runs out, we will send a digest email to: {{email}}',
    sequence: {
      1: { open: false, opacity: HINT_HIDDEN_OPACITY },
      2: { open: false, opacity: HINT_HIDDEN_OPACITY },
      3: { open: false, opacity: HINT_HIDDEN_OPACITY },
      4: { open: true, opacity: HINT_VISIBLE_OPACITY },
      5: { open: true, opacity: HINT_MIDDLE_OPACITY },
    },
  },
};
