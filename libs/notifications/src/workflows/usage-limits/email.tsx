import { BILLING_SETTINGS_PATH, USAGE_LIMITS_DASHBOARD_PATH } from '@novu/shared';
import { Button, Heading, renderAsync, Section, Text } from '@react-email/components';
import React from 'react';
import { EmailLayout } from '../../templates/layout';
import { UsageLimitsPayload } from './schemas';

type UsageLimitsAlertCase =
  | 'free_75'
  | 'free_90'
  | 'free_paused'
  | 'usage_update'
  | 'included_used'
  | 'included_used_will_pause'
  | 'limit_75'
  | 'limit_90'
  | 'limit_reached'
  | 'pause_75'
  | 'pause_90'
  | 'limit_paused';

interface IUsageFigures {
  organizationName: string;
  planName: string;
  percentage: number;
  usage: number;
  limit: number;
  /** Null on Free and trials. */
  includedEvents: number | null;
  remaining: number;
}

export interface IUsageLimitsCopy {
  email: { subject: string; preview: string; heading: string; summary?: string; message: string; note?: string };
  inApp: { subject: string; body: string };
  /** The path is relative to the dashboard host. */
  button: { label: string; path: string };
}

const UPGRADE_PLAN_BUTTON = { label: 'Upgrade plan', path: BILLING_SETTINGS_PATH };
const VIEW_USAGE_BUTTON = { label: 'View usage', path: BILLING_SETTINGS_PATH };
const REVIEW_USAGE_LIMITS_BUTTON = { label: 'Review usage limits', path: USAGE_LIMITS_DASHBOARD_PATH };
const EDIT_USAGE_LIMITS_BUTTON = { label: 'Edit usage limits', path: USAGE_LIMITS_DASHBOARD_PATH };

const formatCount = (value: number) => value.toLocaleString('en-US');

/** The formatted count followed by the singular words when it is 1, e.g. "1 event remains" or "7,500 events remain". */
function formatCountPhrase(count: number, singular: string, plural: string) {
  return `${formatCount(count)} ${count === 1 ? singular : plural}`;
}

function onDemandSummary({ organizationName, planName, usage, limit, includedEvents }: IUsageFigures) {
  const included = includedEvents ?? 0;
  const limitSentence = `Your usage limit is ${formatCount(limit)} workflow runs.`;

  if (usage > included) {
    return `${organizationName} has used ${formatCount(usage)} workflow runs this billing period: ${formatCount(included)} included in the ${planName} plan and ${formatCount(usage - included)} on demand. ${limitSentence}`;
  }

  return `${organizationName} has used ${formatCount(usage)} of the ${formatCount(included)} workflow runs included in the ${planName} plan. ${limitSentence}`;
}

function pausedSummary({ organizationName, planName, limit, includedEvents }: IUsageFigures) {
  const included = includedEvents ?? 0;

  if (limit > included) {
    return `${organizationName} has reached its ${formatCount(limit)} workflow run usage limit: ${formatCount(included)} included in the ${planName} plan and ${formatCount(limit - included)} on demand.`;
  }

  return `${organizationName} has reached its ${formatCount(limit)} workflow run usage limit.`;
}

const USAGE_LIMITS_COPY: Record<UsageLimitsAlertCase, (figures: IUsageFigures) => IUsageLimitsCopy> = {
  free_75: ({ organizationName, planName, usage, limit, remaining }) => {
    const subject = 'You are approaching your monthly event limit';
    const usedPercent = limit === 0 ? 0 : Math.floor((usage / limit) * 100);
    const remainBeforePause = `${formatCountPhrase(remaining, 'remains', 'remain')} before new notifications pause.`;

    return {
      email: {
        subject,
        preview: `${organizationName} has used ${usedPercent}% of its monthly events. ${remainBeforePause}`,
        heading: 'Your usage is growing',
        summary: `${organizationName} has used ${formatCount(usage)} of the ${formatCount(limit)} monthly events included on the ${planName} plan.`,
        message: `You have ${formatCountPhrase(remaining, 'event', 'events')} left this billing period. At ${formatCount(limit)}, new notifications pause until you upgrade or the next billing period begins.`,
        note: 'Free has a hard monthly event limit. Additional usage is not available.',
      },
      inApp: {
        subject,
        body: `${organizationName} has used ${formatCount(usage)} of ${formatCount(limit)} events. ${remainBeforePause}`,
      },
      button: UPGRADE_PLAN_BUTTON,
    };
  },
  free_90: (figures) => {
    const copy = USAGE_LIMITS_COPY.free_75(figures);
    const subject = 'You are close to your monthly event limit';

    return {
      ...copy,
      email: {
        ...copy.email,
        subject,
        preview: `${formatCountPhrase(figures.remaining, 'event remains', 'events remain')} before new notifications pause.`,
        heading: 'Almost at your monthly limit',
      },
      inApp: { ...copy.inApp, subject },
    };
  },
  free_paused: ({ organizationName, planName, limit }) => ({
    email: {
      subject: 'Monthly event limit reached: notifications are paused',
      preview: `${organizationName} has reached its ${formatCount(limit)}-event monthly limit.`,
      heading: 'Notifications are paused',
      summary: `${organizationName} has used all ${formatCount(limit)} monthly events included on the ${planName} plan.`,
      message:
        'New notifications are paused. Upgrade to resume sending now, or wait until the next billing period begins.',
    },
    inApp: {
      subject: 'Notifications are paused',
      body: `${organizationName} has reached its ${formatCount(limit)}-event monthly limit. Upgrade to resume now, or wait until the next billing period.`,
    },
    button: UPGRADE_PLAN_BUTTON,
  }),
  /** The alert level of a plan without a set limit is internal, so the copy states the usage rather than a percentage. */
  usage_update: ({ organizationName, planName, usage, includedEvents }) => {
    const subject = 'Your workflow usage is higher than usual';
    const preview = `${organizationName} has used ${formatCount(usage)} workflow runs this billing period. Sending continues as usual.`;
    const summary =
      includedEvents === null
        ? `${organizationName} has used ${formatCount(usage)} workflow runs so far this billing period.`
        : `${organizationName} has used ${formatCount(usage)} workflow runs this billing period. The ${planName} plan includes ${formatCount(includedEvents)}; additional runs are billed on demand.`;

    return {
      email: {
        subject,
        preview,
        heading: 'Your workflows have been busy',
        summary,
        message:
          'Nothing is paused. If this usage is expected, there is nothing to do. If not, take a look at your workflows and triggers to see what is driving it.',
      },
      inApp: { subject, body: preview },
      button: VIEW_USAGE_BUTTON,
    };
  },
  included_used: ({ organizationName, planName, limit, includedEvents }) => {
    const subject = 'You have used your included workflow runs';
    const included = formatCount(includedEvents ?? 0);

    return {
      email: {
        subject,
        preview: `${organizationName} has used all ${included} included runs. Additional runs are now billed on demand.`,
        heading: 'Your included workflow runs are used',
        summary: `${organizationName} has used all ${included} workflow runs included in the ${planName} plan this billing period.`,
        message: `Workflow runs continue as usual. Additional runs are now billed on demand. We’ll check in again as you approach your ${formatCount(limit)}-run usage limit.`,
      },
      inApp: {
        subject,
        body: `${organizationName} has used all ${included} included runs. Workflow runs continue as usual, with additional runs billed on demand.`,
      },
      button: REVIEW_USAGE_LIMITS_BUTTON,
    };
  },
  included_used_will_pause: ({ organizationName }) => {
    const subject = 'You have used your included workflow runs';

    return {
      email: {
        subject,
        preview: `${organizationName} has used all included workflow runs. Additional runs are now billed on demand.`,
        heading: 'Your included workflow runs are used',
        message:
          'Workflow runs continue as usual. Additional runs are now billed on demand. We’ll check in again as you approach your usage limit.',
      },
      inApp: {
        subject,
        body: `${organizationName} has used all included workflow runs. Workflow runs continue as usual, with additional runs billed on demand.`,
      },
      button: REVIEW_USAGE_LIMITS_BUTTON,
    };
  },
  limit_75: (figures) => {
    const { organizationName, usage, limit } = figures;
    const subject = 'You have used 75% of your usage limit';
    const preview = `${organizationName} has used ${formatCount(usage)} of ${formatCount(limit)} workflow runs. Sending will continue past the limit.`;

    return {
      email: {
        subject,
        preview,
        heading: 'Your usage is picking up',
        summary: onDemandSummary(figures),
        message: `This is an alert-only limit. Workflow runs will continue past ${formatCount(limit)}, with additional usage billed on demand. You can change the limit or turn on pause at limit at any time.`,
      },
      inApp: { subject, body: preview },
      button: REVIEW_USAGE_LIMITS_BUTTON,
    };
  },
  limit_90: (figures) => {
    const copy = USAGE_LIMITS_COPY.limit_75(figures);
    const subject = 'You are approaching your usage limit';

    return {
      ...copy,
      email: {
        ...copy.email,
        subject,
        heading: 'You are getting close to your usage limit',
        message: `You are close to the limit you set, but nothing will pause there. Workflow runs will continue past ${formatCount(figures.limit)}, with additional usage billed on demand. Adjust the limit or turn on pause at limit if you want sending to stop there.`,
      },
      inApp: { ...copy.inApp, subject },
    };
  },
  limit_reached: (figures) => {
    const { organizationName, limit } = figures;
    const subject = 'You have reached your usage limit';

    return {
      email: {
        subject,
        preview: `${organizationName} has reached ${formatCount(limit)} workflow runs. Sending continues.`,
        heading: 'You hit your limit. We are still sending.',
        summary: onDemandSummary(figures),
        message:
          'This is an alert-only limit, so nothing is paused. Workflow runs continue, and additional usage is billed on demand. Update your limit or turn on pause at limit if you want sending to stop there.',
      },
      inApp: {
        subject,
        body: `${organizationName} has reached its ${formatCount(limit)} workflow run limit. Nothing is paused, and additional runs are billed on demand.`,
      },
      button: REVIEW_USAGE_LIMITS_BUTTON,
    };
  },
  pause_75: (figures) => {
    const { organizationName, usage, limit } = figures;
    const subject = 'You have used 75% of your usage limit';
    const preview = `${organizationName} has used ${formatCount(usage)} of ${formatCount(limit)} workflow runs. New workflow runs will pause at the limit.`;

    return {
      email: {
        subject,
        preview,
        heading: 'Your usage is picking up',
        summary: onDemandSummary(figures),
        message: `New workflow runs will pause at ${formatCount(limit)}. Raise the limit or turn off pause at limit if you expect more usage.`,
      },
      inApp: { subject, body: preview },
      button: EDIT_USAGE_LIMITS_BUTTON,
    };
  },
  pause_90: (figures) => {
    const { organizationName, limit, remaining } = figures;
    const subject = 'You are approaching your usage limit';
    const runsRemain = formatCountPhrase(remaining, 'workflow run remains', 'workflow runs remain');

    return {
      email: {
        subject,
        preview: `${runsRemain} before new runs pause.`,
        heading: `${formatCountPhrase(remaining, 'run left', 'runs left')} before pausing`,
        summary: onDemandSummary(figures),
        message: `You have ${formatCountPhrase(remaining, 'workflow run left', 'workflow runs left')} before new runs pause. Raise the limit or turn off pause at limit to keep sending.`,
      },
      inApp: {
        subject,
        body: `${runsRemain} before ${organizationName} reaches its ${formatCount(limit)} limit and new runs pause.`,
      },
      button: EDIT_USAGE_LIMITS_BUTTON,
    };
  },
  limit_paused: (figures) => {
    const { organizationName, limit } = figures;

    return {
      email: {
        subject: 'Usage limit reached: workflow runs are paused',
        preview: `${organizationName} reached its ${formatCount(limit)}-run usage limit. Update your limit to resume.`,
        heading: 'Workflow runs are paused',
        summary: pausedSummary(figures),
        message:
          'Raise your limit or turn off pause at limit to resume now. Otherwise, workflow runs resume when the next billing period begins.',
      },
      inApp: {
        subject: 'Workflow runs are paused',
        body: `${organizationName} reached its ${formatCount(limit)}-run usage limit. Raise the limit or turn off pause at limit to resume.`,
      },
      button: EDIT_USAGE_LIMITS_BUTTON,
    };
  },
};

function resolveAlertCase(
  { alertState = 'approaching_limit', usageLimits }: Partial<UsageLimitsPayload>,
  { percentage }: IUsageFigures
): UsageLimitsAlertCase {
  const isLimitSet = usageLimits?.isLimitSet === true;
  const pausesAtLimit = usageLimits?.pausesAtLimit === true;

  switch (alertState) {
    case 'included_exhausted':
      return pausesAtLimit ? 'included_used_will_pause' : 'included_used';
    case 'approaching_limit':
      if (isLimitSet) {
        return percentage >= 90 ? 'pause_90' : 'pause_75';
      }

      return percentage >= 90 ? 'free_90' : 'free_75';
    case 'blocked':
      return isLimitSet ? 'limit_paused' : 'free_paused';
    case 'alert_level_reached':
      if (!isLimitSet) {
        return 'usage_update';
      }

      if (percentage >= 100) {
        return 'limit_reached';
      }

      if (percentage >= 90) {
        return 'limit_90';
      }

      return 'limit_75';
    default: {
      const unhandled: never = alertState;

      throw new Error(`Unhandled usage limits alert state: ${unhandled}`);
    }
  }
}

// The framework passes a partial payload (e.g. step previews), so every field needs a fallback.
export function getUsageLimitsCopy(payload: Partial<UsageLimitsPayload>): IUsageLimitsCopy {
  const { organizationName = '', planName = '', percentage = 0, usage = 0, allowance = 0, usageLimits } = payload;
  const figures: IUsageFigures = {
    organizationName,
    planName,
    percentage: Math.round(percentage),
    usage,
    limit: allowance,
    includedEvents: usageLimits?.includedEvents ?? null,
    remaining: Math.max(allowance - usage, 0),
  };

  return USAGE_LIMITS_COPY[resolveAlertCase(payload, figures)](figures);
}

// Read at render time: the step runs in the API's bridge, whose env names the recipient's regional dashboard.
function dashboardUrl(path: string) {
  return `${process.env.DASHBOARD_URL || process.env.FRONT_BASE_URL || 'https://dashboard.novu.co'}${path}`;
}

interface IEmailProps {
  copy: IUsageLimitsCopy;
}

export function UsageLimitsEmail({ copy }: IEmailProps) {
  return (
    <EmailLayout previewText={copy.email.preview}>
      <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
        {copy.email.heading}
      </Heading>
      {copy.email.summary && <Text className="text-[14px] leading-[24px] text-black">{copy.email.summary}</Text>}

      <Text className="text-[14px] leading-[24px] text-black">{copy.email.message}</Text>

      <Section className="mb-[32px] mt-[32px] text-center">
        <Button
          className="rounded bg-[#000000] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
          href={dashboardUrl(copy.button.path)}
        >
          {copy.button.label}
        </Button>
      </Section>

      {copy.email.note && <Text className="text-[12px] leading-[20px] text-gray-500">{copy.email.note}</Text>}
    </EmailLayout>
  );
}

export async function renderUsageLimitsEmail(copy: IUsageLimitsCopy) {
  return renderAsync(<UsageLimitsEmail copy={copy} />);
}
