import { css } from '@novu/novui/css';
import { Text } from '@novu/novui';
import styled from '@emotion/styled';
import { ApiServiceLevelEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { IconCheck as _IconCheck } from '@novu/novui/icons';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';

const TitleCell = styled.div`
  display: flex;
  padding: 16px 24px;
  flex-direction: column;
  align-items: flex-start;
  align-self: stretch;
  flex: 1 0 0;
`;

const Cell = styled.div`
  display: flex;
  padding: 16px;
  flex: 1 0 0;
  align-self: stretch;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  align-items: center;
`;

const IconCheck = () => (
  <_IconCheck
    className={css({
      color: {
        base: 'typography.text.primary !important',
        _dark: 'typography.text.main !important',
      },
    })}
  />
);

enum LegacySupportedPlansEnum {
  FREE = ApiServiceLevelEnum.FREE,
  BUSINESS = ApiServiceLevelEnum.BUSINESS,
  ENTERPRISE = ApiServiceLevelEnum.ENTERPRISE,
}

enum SupportedPlansEnum {
  FREE = ApiServiceLevelEnum.FREE,
  PRO = ApiServiceLevelEnum.PRO,
  TEAM = ApiServiceLevelEnum.BUSINESS,
  ENTERPRISE = ApiServiceLevelEnum.ENTERPRISE,
}

type FeatureValue = {
  value: React.ReactNode;
};

type Feature<T extends LegacySupportedPlansEnum | SupportedPlansEnum> = {
  label: string;
  isTitle?: boolean;
  isContrast?: boolean;
  values: {
    [K in T]: FeatureValue;
  };
};

const featuresLegacy: Feature<LegacySupportedPlansEnum>[] = [
  {
    label: 'Platform',
    isTitle: true,
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: '' },
      [LegacySupportedPlansEnum.BUSINESS]: { value: '' },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Monthly events',
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: 'Up to 30,000' },
      [LegacySupportedPlansEnum.BUSINESS]: { value: 'Up to 250,000' },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: '5,000,000' },
    },
  },
  {
    label: 'Additional Events',
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: '-' },
      [LegacySupportedPlansEnum.BUSINESS]: { value: '$0.0012 per event' },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: 'Custom' },
    },
  },
  {
    label: 'Email, InApp, SMS, Chat, Push Channels',
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [LegacySupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Notification subscribers',
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: 'Unlimited' },
      [LegacySupportedPlansEnum.BUSINESS]: { value: 'Unlimited' },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Framework',
    isTitle: true,
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: '' },
      [LegacySupportedPlansEnum.BUSINESS]: { value: '' },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Total workflows',
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: 'Unlimited' },
      [LegacySupportedPlansEnum.BUSINESS]: { value: 'Unlimited' },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Provider integrations',
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: 'Unlimited' },
      [LegacySupportedPlansEnum.BUSINESS]: { value: 'Unlimited' },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Activity Feed retention',
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: '30 days' },
      [LegacySupportedPlansEnum.BUSINESS]: { value: '90 days' },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Digests',
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [LegacySupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Step controls',
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [LegacySupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Inbox',
    isTitle: true,
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: '' },
      [LegacySupportedPlansEnum.BUSINESS]: { value: '' },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Inbox component',
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [LegacySupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'User preferences component',
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [LegacySupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Remove Novu branding',
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: '-' },
      [LegacySupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Account administration and security',
    isTitle: true,
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: '' },
      [LegacySupportedPlansEnum.BUSINESS]: { value: '' },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Team members',
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: '3' },
      [LegacySupportedPlansEnum.BUSINESS]: { value: 'Unlimited' },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'RBAC',
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: '-' },
      [LegacySupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'GDPR compliance',
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [LegacySupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'SAML SSO and Enterprise SSO providers',
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: '-' },
      [LegacySupportedPlansEnum.BUSINESS]: { value: '-' },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Support and account management',
    isTitle: true,
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: '' },
      [LegacySupportedPlansEnum.BUSINESS]: { value: '' },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Support SLA',
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: '-' },
      [LegacySupportedPlansEnum.BUSINESS]: { value: '48 hours' },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: '24 hours' },
    },
  },
  {
    label: 'Support channels',
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: 'Community & Discord' },
      [LegacySupportedPlansEnum.BUSINESS]: { value: 'Slack & Email' },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: 'Dedicated' },
    },
  },
  {
    label: 'Legal & Vendor management',
    isTitle: true,
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: '' },
      [LegacySupportedPlansEnum.BUSINESS]: { value: '' },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Payment method',
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: '-' },
      [LegacySupportedPlansEnum.BUSINESS]: { value: 'Credit card only' },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: 'Credit card & PO and Invoicing' },
    },
  },
  {
    label: 'Terms of service',
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: 'Standard' },
      [LegacySupportedPlansEnum.BUSINESS]: { value: 'Standard' },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: 'Custom' },
    },
  },
  {
    label: 'DPA',
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: 'Standard' },
      [LegacySupportedPlansEnum.BUSINESS]: { value: 'Standard' },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: 'Custom' },
    },
  },
  {
    label: 'Security review',
    values: {
      [LegacySupportedPlansEnum.FREE]: { value: 'SOC 2 and ISO 27001 upon request' },
      [LegacySupportedPlansEnum.BUSINESS]: { value: 'Custom' },
      [LegacySupportedPlansEnum.ENTERPRISE]: { value: 'Custom' },
    },
  },
];

const featuresNew: Feature<SupportedPlansEnum>[] = [
  {
    label: 'Platform',
    isTitle: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '' },
      [SupportedPlansEnum.PRO]: { value: '' },
      [SupportedPlansEnum.TEAM]: { value: '' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Max API Requests (RPS)',
    values: {
      [SupportedPlansEnum.FREE]: { value: '60/20/30 per second' },
      [SupportedPlansEnum.PRO]: { value: '240/80/120 per second' },
      [SupportedPlansEnum.TEAM]: { value: '600/200/300 per second' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '6K/2K/3K per second' },
    },
  },
  {
    label: 'Cost per additional 1k events',
    values: {
      [SupportedPlansEnum.FREE]: { value: '-' },
      [SupportedPlansEnum.PRO]: { value: '$1.20' },
      [SupportedPlansEnum.TEAM]: { value: '$1.20' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Custom' },
    },
  },
  {
    label: 'Channels supported: Email, In-app, SMS, Chat, Push',
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.PRO]: { value: <IconCheck /> },
      [SupportedPlansEnum.TEAM]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Subscribers',
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Unlimited' },
      [SupportedPlansEnum.PRO]: { value: 'Unlimited' },
      [SupportedPlansEnum.TEAM]: { value: 'Unlimited' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Max workflows',
    values: {
      [SupportedPlansEnum.FREE]: { value: '20' },
      [SupportedPlansEnum.PRO]: { value: '20' },
      [SupportedPlansEnum.TEAM]: { value: 'Unlimited' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'GUI-Based Workflow Management',
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.PRO]: { value: <IconCheck /> },
      [SupportedPlansEnum.TEAM]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Code-Based Workflow Management',
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.PRO]: { value: <IconCheck /> },
      [SupportedPlansEnum.TEAM]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Subscriber Management',
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.PRO]: { value: <IconCheck /> },
      [SupportedPlansEnum.TEAM]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Environments',
    values: {
      [SupportedPlansEnum.FREE]: { value: '2' },
      [SupportedPlansEnum.PRO]: { value: '2' },
      [SupportedPlansEnum.TEAM]: { value: '10' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Multi-org/multi-tenancy',
    values: {
      [SupportedPlansEnum.FREE]: { value: '-' },
      [SupportedPlansEnum.PRO]: { value: '-' },
      [SupportedPlansEnum.TEAM]: { value: 'Q2 2025' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Q2 2025' },
    },
  },
  {
    label: 'Provider integrations',
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Unlimited' },
      [SupportedPlansEnum.PRO]: { value: 'Unlimited' },
      [SupportedPlansEnum.TEAM]: { value: 'Unlimited' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Activity Feed retention',
    values: {
      [SupportedPlansEnum.FREE]: { value: '24hr' },
      [SupportedPlansEnum.PRO]: { value: '7 days' },
      [SupportedPlansEnum.TEAM]: { value: '90 days' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Max Digest Window/Time',
    values: {
      [SupportedPlansEnum.FREE]: { value: '24hr' },
      [SupportedPlansEnum.PRO]: { value: '7 days' },
      [SupportedPlansEnum.TEAM]: { value: '30 days' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Yes' },
    },
  },
  {
    label: 'Block-Based Email Editor',
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.PRO]: { value: <IconCheck /> },
      [SupportedPlansEnum.TEAM]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Remove Novu branding',
    values: {
      [SupportedPlansEnum.FREE]: { value: '-' },
      [SupportedPlansEnum.PRO]: { value: <IconCheck /> },
      [SupportedPlansEnum.TEAM]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Inbox',
    isTitle: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '' },
      [SupportedPlansEnum.PRO]: { value: '' },
      [SupportedPlansEnum.TEAM]: { value: '' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Inbox Component',
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.PRO]: { value: <IconCheck /> },
      [SupportedPlansEnum.TEAM]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'User Preferences Component',
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.PRO]: { value: <IconCheck /> },
      [SupportedPlansEnum.TEAM]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Bell Component',
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.PRO]: { value: <IconCheck /> },
      [SupportedPlansEnum.TEAM]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Notifications Component',
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.PRO]: { value: <IconCheck /> },
      [SupportedPlansEnum.TEAM]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Inbox Content Component',
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.PRO]: { value: <IconCheck /> },
      [SupportedPlansEnum.TEAM]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Account administration and security',
    isTitle: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '' },
      [SupportedPlansEnum.PRO]: { value: '' },
      [SupportedPlansEnum.TEAM]: { value: '' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Max Team Members',
    values: {
      [SupportedPlansEnum.FREE]: { value: '3' },
      [SupportedPlansEnum.PRO]: { value: '3' },
      [SupportedPlansEnum.TEAM]: { value: 'Unlimited' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Role-Based Access Control (RBAC)',
    values: {
      [SupportedPlansEnum.FREE]: { value: '-' },
      [SupportedPlansEnum.PRO]: { value: '-' },
      [SupportedPlansEnum.TEAM]: { value: 'Q2 2025' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Q2 2025' },
    },
  },
  {
    label: 'Standard Built-In Authentication (Google, Github)',
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.PRO]: { value: <IconCheck /> },
      [SupportedPlansEnum.TEAM]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Custom SAML SSO, OIDC, Enterprise Providers',
    values: {
      [SupportedPlansEnum.FREE]: { value: '-' },
      [SupportedPlansEnum.PRO]: { value: '-' },
      [SupportedPlansEnum.TEAM]: { value: '-' },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Multi-Factor Authentication (MFA)',
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.PRO]: { value: <IconCheck /> },
      [SupportedPlansEnum.TEAM]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Compliance',
    isTitle: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '' },
      [SupportedPlansEnum.PRO]: { value: '' },
      [SupportedPlansEnum.TEAM]: { value: '' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'GDPR',
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.PRO]: { value: <IconCheck /> },
      [SupportedPlansEnum.TEAM]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Installation dependent' },
    },
  },
  {
    label: 'SOC 2 / ISO 27001 Report',
    values: {
      [SupportedPlansEnum.FREE]: { value: '-' },
      [SupportedPlansEnum.PRO]: { value: '-' },
      [SupportedPlansEnum.TEAM]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'HIPAA BAA',
    values: {
      [SupportedPlansEnum.FREE]: { value: '-' },
      [SupportedPlansEnum.PRO]: { value: '-' },
      [SupportedPlansEnum.TEAM]: { value: '-' },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Custom Security Reviews',
    values: {
      [SupportedPlansEnum.FREE]: { value: '-' },
      [SupportedPlansEnum.PRO]: { value: '-' },
      [SupportedPlansEnum.TEAM]: { value: '-' },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Data Processing Agreements',
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Standard' },
      [SupportedPlansEnum.PRO]: { value: 'Standard' },
      [SupportedPlansEnum.TEAM]: { value: 'Standard' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Custom' },
    },
  },
];

export const Features = () => {
  const is2025Q1TieringEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_2025_Q1_TIERING_ENABLED);

  const features = is2025Q1TieringEnabled
    ? featuresNew
    : (featuresLegacy as Feature<LegacySupportedPlansEnum | SupportedPlansEnum>[]);

  return (
    <div className={styles.featureList}>
      {features.map((feature, index) => (
        <FeatureRow key={index} feature={feature} index={index} />
      ))}
    </div>
  );
};

const FeatureRow = ({
  feature,
  index,
}: {
  feature: Feature<LegacySupportedPlansEnum | SupportedPlansEnum>;
  index: number;
}) => (
  <div className={styles.rowContainer(index % 2 === 1, feature.isTitle)}>
    <TitleCell>
      <Text
        variant={feature.isTitle ? 'strong' : undefined}
        color={feature.isTitle ? 'typography.text.primary' : 'typography.text.secondary'}
      >
        {feature.label}
      </Text>
    </TitleCell>

    {Object.entries(feature.values).map(([plan, value]) => {
      return <Cell key={plan}>{value.value}</Cell>;
    })}
  </div>
);

const styles = {
  featureList: css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    alignSelf: 'stretch',
  }),
  rowContainer: (isContrast: boolean | undefined, isHeader: boolean | undefined) =>
    css({
      display: 'flex',
      alignItems: 'flex-start',
      alignSelf: 'stretch',
      background: isContrast ? 'surface.panel' : undefined,
      borderTop: isHeader ? '1px solid #34343A !important' : undefined,
      borderBottom: isHeader ? '1px solid #34343A !important' : undefined,
    }),
};
