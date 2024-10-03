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
    label: 'Geographic data residency',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Monthly events',
    isContrast: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Up to 30,000' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Up to 250,000' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Trigger rate limit',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: '60RPS' },
      [SupportedPlansEnum.BUSINESS]: { value: '600RPS' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Custom' },
    },
  },
  {
    label: 'Content',
    isContrast: true,
    isTitle: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '' },
      [SupportedPlansEnum.BUSINESS]: { value: '' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Workflows',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Unlimited' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Unlimited' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Providers',
    isContrast: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Unlimited' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Unlimited' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Subscribers',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Unlimited' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Unlimited' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Team size',
    isContrast: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Up to 2 members' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Up to 15 members' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Topics',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Unlimited' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Unlimited' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Inbox',
    isTitle: true,
    isContrast: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '' },
      [SupportedPlansEnum.BUSINESS]: { value: '' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Topics',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: '-' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Unlimited' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Unlimited' },
    },
  },
  {
    label: 'Remove branding',
    isContrast: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '-' },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Feed retention',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: '90 days' },
      [SupportedPlansEnum.BUSINESS]: { value: '1 year' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Custom' },
    },
  },
  {
    label: 'Features',
    isContrast: true,
    isTitle: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '' },
      [SupportedPlansEnum.BUSINESS]: { value: '' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '' },
    },
  },
  {
    label: 'Subscriber Preference API',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Digest Engine',
    isContrast: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Translation management',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: '-' },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Role-based access control',
    isContrast: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: <Badge label="Coming soon" /> },
      [SupportedPlansEnum.BUSINESS]: { value: <Badge label="Coming soon" /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <Badge label="Coming soon" /> },
    },
  },
  {
    label: 'Inbound reply email',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Google and Github OAuth',
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
      [SupportedPlansEnum.ENTERPRISE]: { value: '-' },
    },
  },
  {
    label: 'Support',
    isContrast: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: 'Chat' },
      [SupportedPlansEnum.BUSINESS]: { value: 'Chat and Email' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Dedicated support' },
    },
  },
  {
    label: 'Support SLA',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: '5 business days' },
      [SupportedPlansEnum.BUSINESS]: { value: '2 business days' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '24 hours' },
    },
  },
  {
    label: 'Uptime SLA',
    isContrast: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '99.9%' },
      [SupportedPlansEnum.BUSINESS]: { value: '99.9%' },
      [SupportedPlansEnum.ENTERPRISE]: { value: 'Custom' },
    },
  },
  {
    label: 'Audit logs',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: '-' },
      [SupportedPlansEnum.BUSINESS]: { value: '-' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '-' },
    },
  },
  {
    label: 'SOC II, ISO27001, GDPR',
    isContrast: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Data warehouse connections',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: '-' },
      [SupportedPlansEnum.BUSINESS]: { value: '-' },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
    },
  },
  {
    label: 'Data processing agreement',
    isContrast: true,
    values: {
      [SupportedPlansEnum.FREE]: { value: '-' },
      [SupportedPlansEnum.BUSINESS]: { value: '-' },
      [SupportedPlansEnum.ENTERPRISE]: { value: '-' },
    },
  },
  {
    label: 'Provider webhook integration',
    isContrast: false,
    values: {
      [SupportedPlansEnum.FREE]: { value: <IconCheck /> },
      [SupportedPlansEnum.BUSINESS]: { value: <IconCheck /> },
      [SupportedPlansEnum.ENTERPRISE]: { value: <IconCheck /> },
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
