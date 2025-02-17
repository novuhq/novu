import { css } from '@novu/novui/css';
import { Title, Text } from '@novu/novui';
import styled from '@emotion/styled';
import { MantineTheme } from '@mantine/core';
import { ApiServiceLevelEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { Badge } from './Badge';
import { PlanActionButton } from './PlanActionButton';
import { ContactUsButton } from './ContactUsButton';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';

const Cell = styled.div`
  display: flex;
  padding: 24px;
  align-items: flex-start;
  flex: 1 0 0;
  align-self: stretch;
  flex-direction: column;
  gap: 16px;
`;

const PriceDisplay = ({ price, subtitle, events }) => (
  <div>
    <div className={styles.priceDisplay}>
      <Title>{price}</Title>
      <Text style={{ paddingBottom: '2px' }}>{subtitle}</Text>
    </div>
    <Text color="typography.text.secondary">{events}</Text>
  </div>
);

const PlansRowLegacy = ({
  theme,
  selectedBillingInterval,
}: {
  theme: MantineTheme;
  selectedBillingInterval: 'month' | 'year';
}) => {
  const businessPlanPrice = selectedBillingInterval === 'year' ? '$2,700' : '$250';

  return (
    <div className={styles.container(theme)}>
      <Cell>
        <Title variant="subsection" color="typography.text.secondary">
          Plans
        </Title>
      </Cell>
      <Cell>
        <Title variant="subsection" color="typography.text.primary">
          Free
        </Title>
        <PriceDisplay price="$0" subtitle="free forever" events="30,000 events per month" />
      </Cell>
      <Cell>
        <Title
          variant="subsection"
          color="typography.text.primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          Business <Badge label="Popular" />
        </Title>
        <PriceDisplay
          price={businessPlanPrice}
          subtitle={`billed ${selectedBillingInterval === 'year' ? 'annually' : 'monthly'}`}
          events="250,000 events per month"
        />
        <PlanActionButton
          selectedBillingInterval={selectedBillingInterval}
          checkoutServiceLevel={ApiServiceLevelEnum.BUSINESS}
        />
      </Cell>
      <Cell style={{ justifyContent: 'space-between' }}>
        <Title variant="subsection" color="typography.text.primary">
          Enterprise
        </Title>
        <Text color="typography.text.secondary">Custom pricing, billing, and extended services.</Text>
        <ContactUsButton />
      </Cell>
    </div>
  );
};

const PlansRowNew = ({
  theme,
  selectedBillingInterval,
}: {
  theme: MantineTheme;
  selectedBillingInterval: 'month' | 'year';
}) => {
  const businessPlanPrice = selectedBillingInterval === 'year' ? '$2,700' : '$250';
  const proPlanPrice = selectedBillingInterval === 'year' ? '$330' : '$30';

  return (
    <div className={styles.container(theme)}>
      <Cell>
        <Title variant="subsection" color="typography.text.secondary">
          Plans
        </Title>
      </Cell>
      <Cell>
        <Title variant="subsection" color="typography.text.primary">
          Free
        </Title>
        <PriceDisplay price="$0" subtitle="free forever" events="10,000 events per month" />
      </Cell>
      <Cell>
        <Title
          variant="subsection"
          color="typography.text.primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          Pro <Badge label="Popular" />
        </Title>
        <PriceDisplay
          price={proPlanPrice}
          subtitle={`billed ${selectedBillingInterval === 'year' ? 'annually' : 'monthly'}`}
          events="30,000 events per month"
        />
        <PlanActionButton
          selectedBillingInterval={selectedBillingInterval}
          checkoutServiceLevel={ApiServiceLevelEnum.PRO}
        />
      </Cell>
      <Cell>
        <Title
          variant="subsection"
          color="typography.text.primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          Team
        </Title>
        <PriceDisplay
          price={businessPlanPrice}
          subtitle={`billed ${selectedBillingInterval === 'year' ? 'annually' : 'monthly'}`}
          events="250,000 events per month"
        />
        <PlanActionButton
          selectedBillingInterval={selectedBillingInterval}
          checkoutServiceLevel={ApiServiceLevelEnum.BUSINESS}
        />
      </Cell>
      <Cell style={{ justifyContent: 'space-between' }}>
        <Title variant="subsection" color="typography.text.primary">
          Enterprise
        </Title>
        <Text color="typography.text.secondary">Custom pricing, billing, and extended services.</Text>
        <ContactUsButton />
      </Cell>
    </div>
  );
};

export const PlansRow = ({
  theme,
  selectedBillingInterval,
}: {
  theme: MantineTheme;
  selectedBillingInterval: 'month' | 'year';
}) => {
  const is2025Q1TieringEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_2025_Q1_TIERING_ENABLED);

  return is2025Q1TieringEnabled ? (
    <PlansRowNew theme={theme} selectedBillingInterval={selectedBillingInterval} />
  ) : (
    <PlansRowLegacy theme={theme} selectedBillingInterval={selectedBillingInterval} />
  );
};

const styles = {
  container: (theme: MantineTheme) =>
    css({
      display: 'flex',
      alignItems: 'flex-start',
      alignSelf: 'stretch',
      borderBottom: theme.colorScheme === 'dark' ? '1px solid #34343A' : '1px solid #e4e2e4ff',
    }),

  priceDisplay: css({
    display: 'flex',
    alignItems: 'flex-end',
    gap: '4px',
  }),
};
