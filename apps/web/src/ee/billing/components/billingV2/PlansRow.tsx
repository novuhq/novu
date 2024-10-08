import { css } from '@novu/novui/css';
import { Title, Text } from '@novu/novui';
import styled from '@emotion/styled';
import { MantineTheme } from '@mantine/core';
import { Badge } from './Badge';
import { PlanActionButton } from './PlanActionButton';
import { ContactUsButton } from './ContactUsButton';

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

export const PlansRow = ({
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
        <PlanActionButton selectedBillingInterval={selectedBillingInterval} />
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
