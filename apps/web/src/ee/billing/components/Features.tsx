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
    isContrast: false,
    isTitle: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '' },
      [SupportedPlansEnum.BUSINESS]: { value: '' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Monthly events',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Up to 30,000' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Up to 250,000' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '5,000,000' },
    },
  },
  {
    label: 'Additional Events',
    isContrast: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '-' },
      [SupportedPlansEnum.BUSINESS]: { value: '$0.0012 per event' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Custom' },
    },
  },
  {
    label: 'Email, InApp, SMS, Chat, Push Channels',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Notification subscribers',
    isContrast: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Unlimited' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Unlimited' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Framework',
    isContrast: false,
    isTitle: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '' },
      [SupportedPlansEnum.BUSINESS]: { value: '' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Total workflows',
    isContrast: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Unlimited' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Unlimited' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Provider integrations',
    isContrast: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Unlimited' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Unlimited' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Activity retention',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: '30 days' },
      [SupportedPlansEnum.BUSINESS]: { value: '90 days' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Digests',
    isContrast: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Step controls',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Inbox',
    isContrast: true,
    isTitle: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '' },
      [SupportedPlansEnum.BUSINESS]: { value: '' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Inbox component',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'User preferences component',
    isContrast: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Remove Novu branding',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: '-' },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Notifications retention',
    isContrast: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: <Badge label="Coming soon" /> },
      [SupportedPlansEnum.BUSINESS]: { value: <Badge label="Coming soon" /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <Badge label="Coming soon" /> },
    },
  },
  {
    label: 'Account administration and security',
    isContrast: false,
    isTitle: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '' },
      [SupportedPlansEnum.BUSINESS]: { value: '' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Team members',
    isContrast: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '3' },
      [SupportedPlansEnum.BUSINESS]: { value: '50' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'RBAC',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'GDPR compliance',
    isContrast: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'SAML SSO and Enterprise SSO providers',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: '-' },
      [SupportedPlansEnum.BUSINESS]: { value: '-' },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Support and account management',
    isContrast: true,
    isTitle: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '' },
      [SupportedPlansEnum.BUSINESS]: { value: '' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Support SLA',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Community & Intercom' },
      [SupportedPlansEnum.BUSINESS]: { value: '48 hours' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '24 hours' },
    },
  },
  {
    label: 'Support channels',
    isContrast: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Community & Intercom' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Chat and Email' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Dedicated support' },
    },
  },
  {
    label: 'Legal & Vendor management',
    isContrast: false,
    isTitle: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '' },
      [SupportedPlansEnum.BUSINESS]: { value: '' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Payment method',
    isContrast: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: 'N/A' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Credit card only' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'PO and Invoicing' },
    },
  },
  {
    label: 'Terms of service',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Standard' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Standard' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Custom' },
    },
  },
  {
    label: 'DPA',
    isContrast: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Standard' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Standard' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Custom' },
    },
  },
  {
    label: 'Security review',
    isContrast: false,
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
        <FeatureRow key={index} feature={feature} />
      ))}
    </div>
  );
};

const FeatureRow = ({ feature }: { feature: Feature }) => (
  <div className={styles.rowContainer(feature.isContrast, feature.isTitle)}>
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
