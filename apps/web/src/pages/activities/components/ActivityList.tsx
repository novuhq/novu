import React from 'react';
import { LoadingOverlay, Pagination, useMantineColorScheme } from '@mantine/core';

import { ActivityItem } from './ActivityItem';
import { colors } from '../../../design-system';

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
      {pagination && total > 0 && pageSize > 1 && getPageCount() > 1 && (
        <Pagination
          styles={{
            item: {
              marginTop: '15px',
              marginBottom: '15px',
              backgroundColor: 'transparent',
              '&[data-active]': {
                backgroundImage: colors.horizontal,
                border: 'none',
              },
            },
          }}
          total={getPageCount()}
          page={current + 1}
          onChange={(pageNumber) => {
            onPageChange(pageNumber - 1);
          }}
          position="center"
        />
      )}
    </div>
  );
}
