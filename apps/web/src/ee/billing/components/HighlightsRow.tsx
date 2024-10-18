import { css } from '@novu/novui/css';
import { Text } from '@novu/novui';
import styled from '@emotion/styled';
import { List } from '@mantine/core';
import { ApiServiceLevelEnum } from '@novu/shared';
import { Badge } from './Badge';

const Cell = styled.div`
  display: flex;
  padding: 24px;
  align-items: flex-start;
  flex: 1 0 0;
  align-self: stretch;
  flex-direction: column;
  gap: 16px;
`;

type Highlight = {
  text: string;
  badgeLabel?: string;
};

type PlanHighlights = {
  [key in ApiServiceLevelEnum]?: Highlight[];
};

const highlights: PlanHighlights = {
  [ApiServiceLevelEnum.FREE]: [
    { text: 'Up to 30,000 events per month' },
    { text: '3 teammates' },
    { text: '30 days Activity Feed retention' },
  ],
  [ApiServiceLevelEnum.BUSINESS]: [
    { text: 'Up to 250,000 events per month' },
    { text: '50 teammates' },
    { text: '90 days Activity Feed retention' },
  ],
  [ApiServiceLevelEnum.ENTERPRISE]: [
    { text: 'Up to 5,000,000 events per month' },
    { text: 'Unlimited teammates' },
    { text: 'SAML SSO' },
  ],
};

const PlanHighlights = ({ planHighlights }: { planHighlights: Highlight[] }) => (
  <Cell>
    <List classNames={styles.list} listStyleType="disc">
      {planHighlights.map((item, index) => (
        <List.Item key={index}>
          <span className={styles.listBadgeItem}>
            {item.text} {item.badgeLabel && <Badge size="xs" label={item.badgeLabel} />}
          </span>
        </List.Item>
      ))}
    </List>
  </Cell>
);

export const HighlightsRow = () => {
  return (
    <div className={styles.container}>
      <Cell>
        <Text color="typography.text.secondary">Highlights</Text>
      </Cell>
      {Object.entries(highlights).map(([planName, planHighlights]) => (
        <PlanHighlights key={planName} planHighlights={planHighlights} />
      ))}
    </div>
  );
};

const styles = {
  container: css({
    display: 'flex',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    background: 'surface.panel',
  }),
  list: {
    item: css({
      lineHeight: '24px !important',
    }),
  },
  listBadgeItem: css({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }),
};
