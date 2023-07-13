import React from 'react';
import { Button, LoadingOverlay, Pagination, useMantineColorScheme } from '@mantine/core';

import { ActivityItem } from './ActivityItem';
import { colors } from '../../../design-system';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export type Data = Record<string, any>;

export interface IListProps {
  data?: Data[];
  loading?: boolean;
  pagination?: any;
  onRowClick: (Event, string) => void;
}

export function ActivityList({ data: userData, pagination = false, loading = false, onRowClick }: IListProps) {
  const { pageSize, total, onPageChange, current } = pagination;
  const { colorScheme } = useMantineColorScheme();
  const data = React.useMemo(() => (userData || [])?.map((row) => ({ ...row })) as Data[], [userData]);
  const getPageCount = () => Math.ceil(total / pageSize);

  return (
    <div style={{ position: 'relative', minHeight: 500 }}>
      <LoadingOverlay
        visible={loading}
        overlayColor={colorScheme === 'dark' ? colors.B30 : colors.B98}
        loaderProps={{
          color: colors.error,
        }}
      />
      <div data-test-id="activities-table">
        {data.map((item) => {
          return <ActivityItem onClick={onRowClick} key={`activity-item-${item.id}`} item={item} />;
        })}
      </div>

      <div
        style={{
          marginTop: '10px',
          display: 'flex',
          width: '100%',
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: '15px',
        }}
      >
        <Button.Group>
          <Button
            variant="default"
            disabled={pagination?.current === 0 || loading}
            onClick={() => onPageChange(pagination?.current - 1)}
          >
            <FontAwesomeIcon icon="chevron-left" />
          </Button>
          <Button
            loading={loading}
            variant="default"
            disabled={!pagination?.hasMore || loading}
            onClick={() => onPageChange(pagination?.current + 1)}
          >
            <FontAwesomeIcon icon="chevron-right" />
          </Button>
        </Button.Group>
      </div>
    </div>
  );
}
