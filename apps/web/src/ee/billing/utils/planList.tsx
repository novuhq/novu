import { ApiServiceLevelEnum } from '@novu/shared';
import React from 'react';
import { PlanFootnoteIcon, PlanFootnoteEnum } from '../components/PlanFootnote';
import { PlanCheckBox } from '../components/PlanCheckBox';
import { PlanRowProps } from '../components/PlanRow';
import { includedEventQuotaFromApiServiceLevel, pricePerThousandEvents } from './plan.constants';
import { formatCurrency } from './formatCurrency';

export const planList: PlanRowProps[] = [
  {
    label: 'Geographic data residency',
    free: <PlanCheckBox />,
    business: <PlanCheckBox />,
    enterprise: <PlanCheckBox />,
  },
  {
    label: 'Monthly triggers',
    free: `Up to ${includedEventQuotaFromApiServiceLevel[ApiServiceLevelEnum.FREE].toLocaleString()}`,
    business: (
      <>
        Unlimited
        <br />
        (${formatCurrency(pricePerThousandEvents)} / per {(1000).toLocaleString()} events)
      </>
    ),
    enterprise: 'Unlimited',
  },
  {
    label: `Trigger rate limit
(Requests per second)`,
    free: '60RPS',
    business: '600RPS',
    enterprise: 'Custom',
  },
  {
    label: 'Content',
    heading: true,
  },
  {
    label: 'Workflows',
    free: 'Unlimited',
    business: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    label: 'Providers',
    free: 'Unlimited',
    business: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    label: 'Subscribers',
    free: 'Unlimited',
    business: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    label: 'Team members',
    free: 'Unlimited',
    business: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    label: 'Topics',
    free: 'Unlimited',
    business: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    label: 'Notification center',
    heading: true,
  },
  {
    label: 'Remove branding',
    free: '-',
    business: <PlanCheckBox />,
    enterprise: <PlanCheckBox />,
  },
  {
    label: 'Feed retention',
    free: '90 days',
    business: '1 year',
    enterprise: 'Custom',
  },
  {
    label: 'Features',
    heading: true,
  },
  {
    label: 'Subscriber preference API',
    free: <PlanCheckBox />,
    business: <PlanCheckBox />,
    enterprise: <PlanCheckBox />,
  },
  {
    label: 'Digest engine',
    free: <PlanCheckBox />,
    business: <PlanCheckBox />,
    enterprise: <PlanCheckBox />,
  },
  {
    label: 'Translation management',
    free: '-',
    business: <PlanCheckBox />,
    enterprise: <PlanCheckBox />,
  },
  {
    label: 'Activity feed retention',
    free: '7 days',
    business: '30 days',
    enterprise: 'Custom',
  },
  {
    label: 'Inbound reply email',
    free: <PlanCheckBox />,
    business: <PlanCheckBox />,
    enterprise: <PlanCheckBox />,
  },
  {
    label: 'Role-based access control',
    free: '-',
    business: <PlanFootnoteIcon id={PlanFootnoteEnum.COMING_SOON} />,
    enterprise: <PlanFootnoteIcon id={PlanFootnoteEnum.COMING_SOON} />,
  },
  {
    label: 'Google workspaces and GitHub SSO',
    free: <PlanCheckBox />,
    business: <PlanCheckBox />,
    enterprise: <PlanCheckBox />,
  },
  {
    label: 'SAML SSO and Enterprise SSO providers',
    free: '-',
    business: '-',
    enterprise: <PlanCheckBox />,
  },
  {
    label: 'Support',
    free: 'Chat',
    business: 'Chat and Email',
    enterprise: 'Dedicated support',
  },
  {
    label: 'Support SLA',
    free: '5 business days',
    business: '2 business days',
    enterprise: '24 hours',
  },
  {
    label: 'Uptime SLA',
    free: '99.9%',
    business: '99.9%',
    enterprise: 'Custom',
  },
  {
    label: 'Audit logs',
    free: '-',
    business: '-',
    enterprise: <PlanCheckBox />,
  },
  {
    label: 'SOC II, ISO27001, GDPR',
    free: <PlanCheckBox />,
    business: <PlanCheckBox />,
    enterprise: <PlanCheckBox />,
  },
  {
    label: 'Data warehouse connections',
    free: '-',
    business: '-',
    enterprise: <PlanCheckBox />,
  },
  {
    label: 'Data processing agreement',
    free: '-',
    business: <PlanCheckBox />,
    enterprise: <PlanCheckBox />,
  },
  {
    label: 'Provider webhook Integration',
    free: <PlanCheckBox />,
    business: <PlanCheckBox />,
    enterprise: <PlanCheckBox />,
  },
];
