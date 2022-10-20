import { Grid, Text } from '@mantine/core';
import { colors } from '../../../design-system';
import styled from 'styled-components';
import { When } from '../../../components/utils/When';
import { format } from 'date-fns';
import { useNotificationStatus } from '../hooks/useNotificationStatus';
import { ActivityStep } from './ActivityStep';
import { CheckCircle, ErrorIcon } from '../../../design-system/icons';
import { ExecutionDetailsStatusEnum } from '@novu/shared';

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
            <Grid align="center">
              <Grid.Col span={2}>
                <span
                  style={{
                    marginRight: '15px',
                  }}
                >
                  <When truthy={status === ExecutionDetailsStatusEnum.SUCCESS}>
                    <CheckCircle width="26" height="26" color={colors.success} />
                  </When>
                  <When truthy={status === ExecutionDetailsStatusEnum.FAILED}>
                    <ErrorIcon width="26" height="26" color={colors.error} />
                  </When>
                </span>
              </Grid.Col>
              <Grid.Col span={10}>
                <h3
                  style={{
                    margin: '0px',
                    marginBottom: '8px',
                  }}
                >
                  {item.template.name}
                </h3>
                <When truthy={status === ExecutionDetailsStatusEnum.SUCCESS}>
                  <Text color={colors.success}>Done</Text>
                </When>
                <When truthy={status === ExecutionDetailsStatusEnum.FAILED}>
                  <Text color={colors.error}>Failed</Text>
                </When>
              </Grid.Col>
            </Grid>
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
            <div>
              <small>
                <b>Number of steps:</b> {item.jobs.length}
              </small>
            </div>
          </div>
        </Grid.Col>
        <Grid.Col span={9}>
          <Grid
            justify="end"
            align="center"
            sx={{
              margin: 0,
              height: '100%',
            }}
          >
            {item.jobs.slice(0, 3).map((job) => (
              <ActivityStep job={job} />
            ))}
          </Grid>
        </Grid.Col>
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
