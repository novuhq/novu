import { BILLING_SETTINGS_PATH, USAGE_LIMITS_DASHBOARD_PATH } from '@novu/shared';
import { Button, Heading, renderAsync, Section, Text } from '@react-email/components';
import React from 'react';
import { EmailLayout } from '../../templates/layout';
import { UsageLimitsPayload } from './schemas';

/** The `legacy_*` cases are the alerts sent without `usageLimits`, unchanged from before usage limits. */
type UsageLimitsAlertCase =
  | 'legacy_approaching'
  | 'legacy_blocked'
  | 'legacy_alert_level'
  | 'plan_approaching'
  | 'plan_blocked'
  | 'usage_update'
  | 'included_exhausted'
  | 'limit_approaching'
  | 'limit_paused'
  | 'limit_reached'
  | 'limit_progress';

interface IUsageFigures {
  organizationName: string;
  planName: string;
  percentage: number;
  usage: number;
  allowance: number;
  /** Null unless the payload names the included runs of a plan that bills on-demand past them. */
  includedEvents: number | null;
}

/** The email subject and preview, or the in-app subject and body. */
export interface IUsageLimitsNotificationText {
  subject: string;
  body: string;
}

export interface IUsageLimitsTextControls extends IUsageLimitsNotificationText {
  /** Only the in-app step has these; a blocked email keeps `subject` and `body`. */
  blockedSubject?: string;
  blockedBody?: string;
}

export interface IUsageLimitsCopy {
  heading: string;
  summary: string;
  message: string;
  note?: string;
  buttonLabel: string;
  /** Relative to the dashboard host. */
  dashboardPath: string;
  /** Code-owned text, or which step controls hold it. */
  notificationText: IUsageLimitsNotificationText | 'controls' | 'blocked_controls';
}

export const USAGE_LIMITS_CONTROL_DEFAULTS = {
  subject: 'You are approaching your usage limits',
  body: 'You have used {{payload.percentage}}% of your monthly events',
  blockedSubject: 'Usage limit reached: new notifications are blocked',
  blockedBody: 'You have used 100% of your monthly events. Upgrade to send again, or wait for your next billing cycle.',
};

const KEEPS_SENDING_ON_DEMAND = 'Your notifications keep sending, and additional runs are billed on-demand.';

const formatCount = (value: number) => value.toLocaleString('en-US');

function planAllowanceSummary(
  { organizationName, planName, percentage, usage, allowance }: IUsageFigures,
  allowanceLabel: string
) {
  return {
    heading: `Used ${percentage}% of Your Monthly Events`,
    summary: `Your organization ${organizationName} has used ${formatCount(usage)} events this billing period, ${percentage}% of the ${formatCount(allowance)} events ${allowanceLabel} on the ${planName} plan.`,
  };
}

function approachingPlanLimitCopy(figures: IUsageFigures) {
  return {
    ...planAllowanceSummary(figures, 'monthly limit'),
    message:
      'To ensure uninterrupted service and access to additional features, we recommend upgrading your plan before reaching the limit.',
    note: 'Note: Once you consume 100% of your monthly limit, notifications will be blocked until you upgrade or the next billing cycle begins.',
    buttonLabel: 'Upgrade your plan',
    dashboardPath: BILLING_SETTINGS_PATH,
  };
}

function blockedAtPlanLimitCopy(figures: IUsageFigures) {
  return {
    ...planAllowanceSummary(figures, 'monthly limit'),
    message: 'New notifications are blocked until you upgrade your plan or the next billing cycle begins.',
    buttonLabel: 'Upgrade your plan',
    dashboardPath: BILLING_SETTINGS_PATH,
  };
}

function limitSummary({ organizationName, planName, usage, allowance, includedEvents }: IUsageFigures) {
  const breakdown =
    includedEvents === null
      ? ''
      : `: the ${formatCount(includedEvents)} included in the ${planName} plan and ${formatCount(Math.max(usage - includedEvents, 0))} on-demand`;

  return `Your organization ${organizationName} has used ${formatCount(usage)} workflow runs this billing period${breakdown}. Your usage limit is ${formatCount(allowance)} workflow runs.`;
}

const USAGE_LIMITS_COPY: Record<UsageLimitsAlertCase, (figures: IUsageFigures) => IUsageLimitsCopy> = {
  legacy_approaching: (figures) => ({ ...approachingPlanLimitCopy(figures), notificationText: 'controls' }),
  legacy_blocked: (figures) => ({ ...blockedAtPlanLimitCopy(figures), notificationText: 'blocked_controls' }),
  legacy_alert_level: (figures) => ({
    ...planAllowanceSummary(figures, 'monthly usage alert level'),
    message:
      'Your notifications will keep sending. If this volume is unexpected, review your workflows and triggers, or reach out to us to discuss a plan that fits your usage.',
    buttonLabel: 'Review your usage',
    dashboardPath: BILLING_SETTINGS_PATH,
    notificationText: 'controls',
  }),
  plan_approaching: (figures) => ({
    ...approachingPlanLimitCopy(figures),
    notificationText: {
      subject: USAGE_LIMITS_CONTROL_DEFAULTS.subject,
      body: `You have used ${figures.percentage}% of your monthly events`,
    },
  }),
  plan_blocked: (figures) => ({
    ...blockedAtPlanLimitCopy(figures),
    notificationText: {
      subject: USAGE_LIMITS_CONTROL_DEFAULTS.blockedSubject,
      body: USAGE_LIMITS_CONTROL_DEFAULTS.blockedBody,
    },
  }),
  /** The alert level of a plan without a set limit is internal, so the copy states the usage rather than a percentage. */
  usage_update: ({ organizationName, planName, usage, includedEvents }) => {
    const includedNote =
      includedEvents === null
        ? ''
        : ` Your ${planName} plan includes ${formatCount(includedEvents)} workflow runs, and runs beyond that are billed on-demand.`;

    return {
      heading: 'Your usage this billing period',
      summary: `Your organization ${organizationName} has used ${formatCount(usage)} workflow runs so far this billing period.${includedNote}`,
      message:
        'Nothing changes on your side: your notifications keep sending. We’re letting you know because this is higher than typical for your plan. If it’s expected, no action is needed. If not, it may be worth a look at your workflows and triggers.',
      buttonLabel: 'View usage',
      dashboardPath: BILLING_SETTINGS_PATH,
      notificationText: {
        subject: 'A quick update on your workflow runs',
        body: `${organizationName} has used ${formatCount(usage)} workflow runs this billing period. Your notifications keep sending as usual.`,
      },
    };
  },
  included_exhausted: ({ organizationName, planName, allowance, includedEvents }) => {
    const includedRuns = includedEvents === null ? 'the workflow runs' : `${formatCount(includedEvents)} workflow runs`;

    return {
      heading: 'You’ve used your included workflow runs',
      summary: `Your organization ${organizationName} has used all ${includedRuns} included in the ${planName} plan this billing period.`,
      message: `Nothing changes on your side: your notifications keep sending, and additional runs are billed on-demand. We’ll check in again as you get closer to your ${formatCount(allowance)} usage limit.`,
      buttonLabel: 'Review usage limits',
      dashboardPath: USAGE_LIMITS_DASHBOARD_PATH,
      notificationText: {
        subject: 'You’ve used your included workflow runs',
        body: `You’ve used all ${includedRuns} included in your ${planName} plan. ${KEEPS_SENDING_ON_DEMAND}`,
      },
    };
  },
  limit_approaching: (figures) => ({
    heading: 'Approaching Your Usage Limit',
    summary: limitSummary(figures),
    message:
      'Once usage reaches your limit, new workflow runs are paused until you raise the limit, turn off pause at limit, or the next billing cycle begins.',
    buttonLabel: 'Edit usage limits',
    dashboardPath: USAGE_LIMITS_DASHBOARD_PATH,
    notificationText: {
      subject: 'Approaching your usage limit: new workflow runs will pause',
      body: `You have used ${formatCount(figures.usage)} workflow runs against your ${formatCount(figures.allowance)} usage limit. New workflow runs pause when you reach it.`,
    },
  }),
  limit_paused: (figures) => ({
    heading: 'New Workflow Runs Are Paused',
    summary: limitSummary(figures),
    message:
      'New workflow runs are paused. To resume sending, raise your usage limit or turn off pause at limit. Otherwise, sending resumes when the next billing cycle begins.',
    buttonLabel: 'Edit usage limits',
    dashboardPath: USAGE_LIMITS_DASHBOARD_PATH,
    notificationText: {
      subject: 'Usage limit reached: new workflow runs are paused',
      body: `New workflow runs are paused at your ${formatCount(figures.allowance)} usage limit. Raise the limit or turn off pause at limit to resume sending.`,
    },
  }),
  limit_reached: (figures) => ({
    heading: 'You’ve reached your usage limit',
    summary: limitSummary(figures),
    message:
      'Nothing is paused: your notifications keep sending, and additional runs are billed on-demand. If you’d like more room, or want sending to pause at your limit, you can update your usage limits.',
    buttonLabel: 'Review usage limits',
    dashboardPath: USAGE_LIMITS_DASHBOARD_PATH,
    notificationText: {
      subject: 'You’ve reached your usage limit',
      body: `${figures.organizationName} has reached its ${formatCount(figures.allowance)} workflow run usage limit. ${KEEPS_SENDING_ON_DEMAND}`,
    },
  }),
  limit_progress: (figures) => ({
    heading: `You’re ${figures.percentage}% of the way to your usage limit`,
    summary: limitSummary(figures),
    message:
      'No action is needed. Your notifications keep sending, even past your limit, and additional runs are billed on-demand. If you’d like to change your limit, or pause sending when you reach it, you can do that in your usage limits.',
    buttonLabel: 'Review usage limits',
    dashboardPath: USAGE_LIMITS_DASHBOARD_PATH,
    notificationText: {
      subject: `You’re ${figures.percentage}% of the way to your usage limit`,
      body: `${figures.organizationName} has used ${formatCount(figures.usage)} of its ${formatCount(figures.allowance)} workflow run usage limit. Your notifications keep sending as usual.`,
    },
  }),
};

function resolveAlertCase({
  alertState = 'approaching_limit',
  percentage = 0,
  usageLimits,
}: Partial<UsageLimitsPayload>): UsageLimitsAlertCase {
  switch (alertState) {
    case 'included_exhausted':
      return 'included_exhausted';
    case 'approaching_limit':
      if (!usageLimits) {
        return 'legacy_approaching';
      }

      return usageLimits.isLimitSet ? 'limit_approaching' : 'plan_approaching';
    case 'blocked':
      if (!usageLimits) {
        return 'legacy_blocked';
      }

      return usageLimits.isLimitSet ? 'limit_paused' : 'plan_blocked';
    case 'alert_level_reached':
      if (!usageLimits) {
        return 'legacy_alert_level';
      }

      if (!usageLimits.isLimitSet) {
        return 'usage_update';
      }

      return percentage >= 100 ? 'limit_reached' : 'limit_progress';
    default: {
      const unhandled: never = alertState;

      throw new Error(`Unhandled usage limits alert state: ${unhandled}`);
    }
  }
}

// The framework passes a partial payload (e.g. step previews), so every field needs a fallback.
export function getUsageLimitsCopy(payload: Partial<UsageLimitsPayload>): IUsageLimitsCopy {
  const { organizationName = '', planName = '', percentage = 0, usage = 0, allowance = 0, usageLimits } = payload;
  const includedEvents = usageLimits?.includedEvents;

  return USAGE_LIMITS_COPY[resolveAlertCase(payload)]({
    organizationName,
    planName,
    percentage: Math.round(percentage),
    usage,
    allowance,
    includedEvents: typeof includedEvents === 'number' ? includedEvents : null,
  });
}

export function getUsageLimitsNotificationText(
  { notificationText }: IUsageLimitsCopy,
  { subject, body, blockedSubject = subject, blockedBody = body }: IUsageLimitsTextControls
): IUsageLimitsNotificationText {
  if (notificationText === 'controls') {
    return { subject, body };
  }

  if (notificationText === 'blocked_controls') {
    return { subject: blockedSubject, body: blockedBody };
  }

  return notificationText;
}

// Read at render time: the step runs in the API's bridge, whose env names the recipient's regional dashboard.
function dashboardUrl(path: string) {
  return `${process.env.DASHBOARD_URL || process.env.FRONT_BASE_URL || 'https://dashboard.novu.co'}${path}`;
}

interface IEmailProps {
  copy: IUsageLimitsCopy;
  previewText: string;
}

export function UsageLimitsEmail({ copy, previewText }: IEmailProps) {
  return (
    <EmailLayout previewText={previewText}>
      <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">{copy.heading}</Heading>
      <Text className="text-[14px] leading-[24px] text-black">{copy.summary}</Text>

      <Text className="text-[14px] leading-[24px] text-black">{copy.message}</Text>

      <Section className="mb-[32px] mt-[32px] text-center">
        <Button
          className="rounded bg-[#000000] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
          href={dashboardUrl(copy.dashboardPath)}
        >
          {copy.buttonLabel}
        </Button>
      </Section>

      {copy.note && <Text className="text-[12px] leading-[20px] text-gray-500">{copy.note}</Text>}
    </EmailLayout>
  );
}

export async function renderUsageLimitsEmail(copy: IUsageLimitsCopy, previewText: string) {
  return renderAsync(<UsageLimitsEmail copy={copy} previewText={previewText} />);
}
