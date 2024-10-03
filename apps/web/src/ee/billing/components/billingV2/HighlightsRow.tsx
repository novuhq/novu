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
    { text: '7 days activity feed' },
    { text: '2 teammates' },
    { text: 'RBAC' },
  ],
  [ApiServiceLevelEnum.BUSINESS]: [
    { text: 'Unlimited events per month' },
    { text: '30 days activity feed' },
    { text: '15 teammates' },
    { text: 'RBAC', badgeLabel: 'Coming soon' },
  ],
  [ApiServiceLevelEnum.ENTERPRISE]: [
    { text: 'Unlimited events per month' },
    { text: 'Custom time activity feed' },
    { text: 'Unlimited teammates' },
    { text: 'Workspace analytics' },
    { text: 'RBAC', badgeLabel: 'Coming soon' },
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
