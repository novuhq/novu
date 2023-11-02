import React from 'react';
import { Button, LoadingOverlay, Pagination, useMantineColorScheme } from '@mantine/core';

import { ActivityItem } from './ActivityItem';
import { colors, ChevronLeft, ChevronRight } from '@novu/design-system';

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
          justifyContent: 'center',
          alignItems: 'center',
          padding: '15px',
        }}
      >
        <Button.Group>
          <Button
            variant="outline"
            disabled={pagination?.current === 0 || loading}
            onClick={() => onPageChange(pagination?.current - 1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            disabled={!pagination?.hasMore || loading}
            onClick={() => onPageChange(pagination?.current + 1)}
          >
            <ChevronRight />
          </Button>
        </Button.Group>
      </div>
    </div>
  );
}
