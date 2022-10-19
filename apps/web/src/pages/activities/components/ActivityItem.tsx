import { Grid, Text } from '@mantine/core';
import { colors } from '../../../design-system';
import styled from 'styled-components';
import { When } from '../../../components/utils/When';
import { format } from 'date-fns';
import { useNotificationStatus } from '../hooks/useNotificationStatus';
import { ActivityStep } from './ActivityStep';

export const ActivityItem = ({ item }) => {
  const status = useNotificationStatus(item);

  return (
    <ListItem>
      <Grid gutter={10}>
        <Grid.Col span={3}>
          <div
            style={{
              marginBottom: '16px',
            }}
          >
            <h3
              style={{
                margin: '0px',
                marginBottom: '8px',
              }}
            >
              {item.template.name}
            </h3>
            <When truthy={status === 'Success'}>
              <Text color={colors.success}>Done</Text>
            </When>
            <When truthy={status === 'Failed'}>
              <Text color={colors.error}>Failed</Text>
            </When>
          </div>
          <div>
            <small>
              <b>Date:</b> {format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm')}
            </small>
            <div>
              <small>
                <b>Subscriber id:</b> {item.subscriber.id}
              </small>
            </div>
          </div>
        </Grid.Col>
        {item.jobs.slice(0, 3).map((job) => (
          <ActivityStep job={job} />
        ))}
      </Grid>
    </ListItem>
  );
};

const ListItem = styled.div`
  padding: 20px;
  padding-left: 15px;
  margin-left: 30px;
  margin-right: 30px;
  border: 1px solid ${colors.B30};
  margin-bottom: 15px;
  border-radius: 7px;
  color: ${colors.B80};
`;
