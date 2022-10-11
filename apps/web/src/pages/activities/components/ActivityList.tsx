import React from 'react';
import { Grid, LoadingOverlay, Pagination, useMantineColorScheme } from '@mantine/core';
import { colors } from '../../../design-system';
import styled from 'styled-components';
import { When } from '../../../components/utils/When';
import { providers } from '@novu/shared';
import { format } from 'date-fns';
import * as capitalize from 'lodash.capitalize';

export type Data = Record<string, any>;

export interface IListProps {
  data?: Data[];
  loading?: boolean;
  pagination?: any;
}

const ProviderImage = ({ providerId }: { providerId: string | undefined }) => {
  const { colorScheme } = useMantineColorScheme();
  if (!providerId) {
    return null;
  }
  const provider: any = providers.find((item: any) => item.id === providerId);

  if (!provider) {
    return null;
  }

  return (
    <Logo
      src={`/static/images/providers/${colorScheme}/${provider.logoFileName[`${colorScheme}`]}`}
      alt={provider.displayName}
    />
  );
};

const NotificationItem = ({ item }) => {
  const completed = item.jobs.reduce((prev, job) => {
    return ['completed', 'canceled'].includes(job.status);
  }, false);

  const failed = item.jobs.reduce((prev, job) => {
    return job.status === 'failed';
  }, false);

  return (
    <ListItem>
      <Grid gutter={10}>
        <Grid.Col span={2}>
          <h3>{item.template.name}</h3>
          <div>
            <When truthy={completed && !failed}>Done</When>
            <When truthy={failed}>Failed</When>
          </div>
          <div
            style={{
              marginTop: '7px',
            }}
          >
            <small>{format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm')}</small>
            <small>{item.subscriber.id}</small>
          </div>
        </Grid.Col>
        {item.jobs.slice(0, 3).map((job) => {
          return (
            <Grid.Col span={3}>
              <div
                style={{
                  border: '1px solid #3D3D4D',
                  padding: '10px',
                  borderRadius: '2px',
                  height: '100%',
                  width: '100%',
                }}
              >
                <Grid>
                  <Grid.Col span={6}>{capitalize(job.type)}</Grid.Col>
                  <Grid.Col
                    span={6}
                    sx={{
                      textAlign: 'right',
                    }}
                  >
                    <ProviderImage providerId={job.providerId} />
                  </Grid.Col>
                </Grid>
              </div>
            </Grid.Col>
          );
        })}
        <When truthy={item.jobs.length > 3}>
          <Grid.Col span={1}>
            <div
              style={{
                border: '1px solid #3D3D4D',
                borderRight: '0px',
                padding: '10px',
                borderRadius: '2px',
                height: '100%',
                width: '100%',
              }}
            ></div>
          </Grid.Col>
        </When>
      </Grid>
    </ListItem>
  );
};

export function ActivityList({ data: userData, pagination = false, loading = false }: IListProps) {
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
        return <NotificationItem key={index} item={item} />;
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

const ListItem = styled.div`
  padding: 20px;
  border-bottom: 1px solid ${colors.BGDark};
`;

const Logo = styled.img`
  max-width: 140px;
  max-height: 50px;
`;
