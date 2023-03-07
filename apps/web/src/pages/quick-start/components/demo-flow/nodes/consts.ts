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

export const guidePreview: Record<string, IGuide> = {
  trigger: {
    title: GuideTitleEnum.TRIGGER_PREVIEW,
    description: 'Use the server SDK in your app for a specific trigger. ',
    docsUrl: 'https://docs.novu.co/api/trigger-event/',
    sequence: {
      1: { open: true, opacity: 1 },
      2: { open: true, opacity: 0.4 },
      3: { open: true, opacity: 0.4 },
      4: { open: true, opacity: 0.4 },
    },
  },
  digest: {
    title: GuideTitleEnum.DIGEST_PREVIEW,
    description: 'Aggregates multiple events into a precise notification. ',
    docsUrl: 'https://docs.novu.co/platform/digest/',
    sequence: {
      1: { open: false, opacity: 0 },
      2: { open: true, opacity: 1 },
      3: { open: true, opacity: 0.4 },
      4: { open: true, opacity: 1 },
    },
  },
  email: {
    title: GuideTitleEnum.CHANNELS_PREVIEW,
    description: 'Build desired order of channels. ',
    docsUrl: 'https://docs.novu.co/platform/integrations/#provider-channels',
    sequence: {
      1: { open: false, opacity: 0 },
      2: { open: false, opacity: 0 },
      3: { open: true, opacity: 1 },
      4: { open: true, opacity: 0.4 },
    },
  },
};

export const guidePlayground: Record<string, IGuide> = {
  trigger: {
    title: GuideTitleEnum.TRIGGER_PLAYGROUND,
    description: 'Once event triggered, app send it to digest',
    sequence: {
      1: { open: true, opacity: 1 },
      2: { open: true, opacity: 0.4 },
      3: { open: true, opacity: 0.4 },
      4: { open: true, opacity: 0.4 },
    },
  },
  digest: {
    title: GuideTitleEnum.DIGEST_PLAYGROUND,
    description: 'Digest engine aggregates multiple events aaand... ',
    sequence: {
      1: { open: false, opacity: 0 },
      2: { open: true, opacity: 1 },
      3: { open: true, opacity: 0.4 },
      4: { open: true, opacity: 1 },
    },
  },
  email: {
    title: GuideTitleEnum.CHANNELS_PLAYGROUND,
    description: 'As soon as the specified time runs out, it sends a precise notification',
    sequence: {
      1: { open: false, opacity: 0 },
      2: { open: false, opacity: 0 },
      3: { open: true, opacity: 1 },
      4: { open: true, opacity: 0.4 },
    },
  },
};
