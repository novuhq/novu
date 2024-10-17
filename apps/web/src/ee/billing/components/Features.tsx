import { css } from '@novu/novui/css';
import { Text } from '@novu/novui';
import styled from '@emotion/styled';
import { ApiServiceLevelEnum } from '@novu/shared';
import { IconCheck as _IconCheck } from '@novu/novui/icons';
import { Badge } from './Badge';

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

enum SupportedPlansEnum {
  FREE = ApiServiceLevelEnum.FREE,
  BUSINESS = ApiServiceLevelEnum.BUSINESS,
  ENTERPRISE = ApiServiceLevelEnum.ENTERPRISE,
}

type FeatureValue = {
  value: React.ReactNode;
};

type Feature = {
  label: string;
  isTitle?: boolean;
  isContrast?: boolean;
  values: {
    [SupportedPlansEnum.FREE]: FeatureValue;
    [SupportedPlansEnum.BUSINESS]: FeatureValue;
    [SupportedPlansEnum.ENTERPRISE]: FeatureValue;
  };
};

const features: Feature[] = [
  {
    label: 'Platform',
    isTitle: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '' },
      [SupportedPlansEnum.BUSINESS]: { value: '' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Monthly events',
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Up to 30,000' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Up to 250,000' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '5,000,000' },
    },
  },
  {
    label: 'Additional Events',
    values: {
      [SupportedPlansEnum.FREE]: { value: '-' },
      [SupportedPlansEnum.BUSINESS]: { value: '$0.0012 per event' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Custom' },
    },
  },
  {
    label: 'Email, InApp, SMS, Chat, Push Channels',
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Notification subscribers',
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Unlimited' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Unlimited' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Framework',
    isTitle: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '' },
      [SupportedPlansEnum.BUSINESS]: { value: '' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Total workflows',
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Unlimited' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Unlimited' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Provider integrations',
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Unlimited' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Unlimited' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Activity Feed retention',
    values: {
      [SupportedPlansEnum.FREE]: { value: '30 days' },
      [SupportedPlansEnum.BUSINESS]: { value: '90 days' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Digests',
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Step controls',
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Inbox',
    isTitle: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '' },
      [SupportedPlansEnum.BUSINESS]: { value: '' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Inbox component',
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'User preferences component',
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Remove Novu branding',
    values: {
      [SupportedPlansEnum.FREE]: { value: '-' },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Account administration and security',
    isTitle: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '' },
      [SupportedPlansEnum.BUSINESS]: { value: '' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Team members',
    values: {
      [SupportedPlansEnum.FREE]: { value: '3' },
      [SupportedPlansEnum.BUSINESS]: { value: '10' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'RBAC',
    values: {
      [SupportedPlansEnum.FREE]: { value: '-' },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'GDPR compliance',
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'SAML SSO and Enterprise SSO providers',
    values: {
      [SupportedPlansEnum.FREE]: { value: '-' },
      [SupportedPlansEnum.BUSINESS]: { value: '-' },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Support and account management',
    isTitle: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '' },
      [SupportedPlansEnum.BUSINESS]: { value: '' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Support SLA',
    values: {
      [SupportedPlansEnum.FREE]: { value: '-' },
      [SupportedPlansEnum.BUSINESS]: { value: '48 hours' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '24 hours' },
    },
  },
  {
    label: 'Support channels',
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Community & Discord' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Slack & Email' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Dedicated' },
    },
  },
  {
    label: 'Legal & Vendor management',
    isTitle: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '' },
      [SupportedPlansEnum.BUSINESS]: { value: '' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Payment method',
    values: {
      [SupportedPlansEnum.FREE]: { value: '-' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Credit card only' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Credit card & PO and Invoicing' },
    },
  },
  {
    label: 'Terms of service',
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Standard' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Standard' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Custom' },
    },
  },
  {
    label: 'DPA',
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Standard' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Standard' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Custom' },
    },
  },
  {
    label: 'Security review',
    values: {
      [SupportedPlansEnum.FREE]: { value: 'SOC 2 and ISO 27001 upon request' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Custom' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Custom' },
    },
  },
];

export const Features = () => {
  return (
    <div className={styles.featureList}>
      {features.map((feature, index) => (
        <FeatureRow key={index} feature={feature} index={index} />
      ))}
    </div>
  );
};

const FeatureRow = ({ feature, index }: { feature: Feature; index: number }) => (
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
