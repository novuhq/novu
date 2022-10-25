import React from 'react';
import { LoadingOverlay, Pagination, UnstyledButton, useMantineColorScheme } from '@mantine/core';
import { colors } from '../../../design-system';
import { ActivityItem } from './ActivityItem';

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
      {data.map((item, index) => {
        return (
          <UnstyledButton
            onClick={(event) => onRowClick(event, item.id)}
            sx={{
              width: '100%',
            }}
          >
            <ActivityItem key={`activity-item-${item.id}`} item={item} />
          </UnstyledButton>
        );
      })}
      {pagination && total > 0 && pageSize > 1 && getPageCount() > 1 && (
        <Pagination
          styles={{
            active: {
              backgroundImage: colors.horizontal,
              border: 'none',
            },
            item: {
              marginTop: '15px',
              marginBottom: '15px',
              backgroundColor: 'transparent',
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
