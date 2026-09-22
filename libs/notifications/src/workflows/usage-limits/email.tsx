import { Button, Heading, renderAsync, Section, Text } from '@react-email/components';
import React from 'react';
import { EmailLayout } from '../../templates/layout';

interface IEmailProps {
  percentage?: number;
  organizationName?: string;
  usage?: number;
  allowance?: number;
  planName?: string;
  blocksAtLimit?: boolean;
  previewText?: string;
}

const formatCount = (value: number) => value.toLocaleString('en-US');

export function UsageLimitsEmail({
  percentage,
  organizationName,
  usage,
  allowance,
  planName,
  blocksAtLimit,
  previewText,
}: IEmailProps) {
  const roundedPercentage = Math.round(percentage || 0);
  const isBlocked = blocksAtLimit && roundedPercentage >= 100;

  return (
    <EmailLayout previewText={previewText}>
      <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
        Used {roundedPercentage}% of Your Monthly Events
      </Heading>
      <Text className="text-[14px] leading-[24px] text-black">
        Your organization {organizationName} has used {formatCount(usage || 0)} events this billing period,{' '}
        {roundedPercentage}% of the {formatCount(allowance || 0)} events{' '}
        {blocksAtLimit ? 'monthly limit' : 'monthly usage alert level'} on the {planName} plan.
      </Text>

      {isBlocked && (
        <Text className="text-[14px] leading-[24px] text-black">
          New notifications are blocked until you upgrade your plan or the next billing cycle begins.
        </Text>
      )}

      {blocksAtLimit && !isBlocked && (
        <Text className="text-[14px] leading-[24px] text-black">
          To ensure uninterrupted service and access to additional features, we recommend upgrading your plan before
          reaching the limit.
        </Text>
      )}

      {!blocksAtLimit && (
        <Text className="text-[14px] leading-[24px] text-black">
          Your notifications will keep sending. If this volume is unexpected, review your workflows and triggers, or
          reach out to us to discuss a plan that fits your usage.
        </Text>
      )}

      <Section className="mb-[32px] mt-[32px] text-center">
        <Button
          className="rounded bg-[#000000] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
          href={'https://dashboard.novu.co/settings/billing'}
        >
          {blocksAtLimit ? 'Upgrade Your Plan' : 'Review Your Usage'}
        </Button>
      </Section>

      {blocksAtLimit && !isBlocked && (
        <Text className="text-[12px] leading-[20px] text-gray-500">
          Note: Once you consume 100% of your monthly limit, notifications will be blocked until you upgrade or the next
          billing cycle begins.
        </Text>
      )}
    </EmailLayout>
  );
}

export interface IRenderEmailPayload {
  percentage?: number;
  organizationName?: string;
  usage?: number;
  allowance?: number;
  planName?: string;
  blocksAtLimit?: boolean;
}

export interface IEmailControls {
  previewText?: string;
}

export async function renderUsageLimitsEmail(payload: IRenderEmailPayload, controls: IEmailControls) {
  return renderAsync(<UsageLimitsEmail {...payload} {...controls} />);
}
