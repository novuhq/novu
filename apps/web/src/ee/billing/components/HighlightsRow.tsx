import { css } from '@novu/novui/css';
import { Text } from '@novu/novui';
import styled from '@emotion/styled';
import { ApiServiceLevelEnum } from '@novu/shared';

const Cell = styled.div`
  display: flex;
  padding: 24px;
  align-items: flex-start;
  flex: 1 0 0;
  align-self: stretch;
  flex-direction: column;
  gap: 16px;
`;

const descriptions = {
  [ApiServiceLevelEnum.FREE]: 'For testing and small-scale.',
  [ApiServiceLevelEnum.PRO]:
    'Perfect for startups and indie hackers looking to add <Inbox /> and connect to Email and digest engine.',
  [ApiServiceLevelEnum.BUSINESS]:
    'Ideal for teams looking to add <Inbox/> in minutes, and manage system notification experience from one system.',
  [ApiServiceLevelEnum.ENTERPRISE]:
    'For organizations with privacy, and compliance demands. Looking to add the best OS notification technology, while maintaining flexibility.',
};

export const HighlightsRow = () => {
  return <Descriptions />;
};

export const Descriptions = () => {
  return (
    <div className={styles.container}>
      <Cell>
        <Text color="typography.text.secondary">Description</Text>
      </Cell>
      {Object.entries(descriptions).map(([planName, description]) => (
        <Cell key={planName}>
          <Text>{description}</Text>
        </Cell>
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
