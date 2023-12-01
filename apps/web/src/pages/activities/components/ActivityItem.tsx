import { useEffect, useState } from 'react';
import { createStyles, CSSObject, Grid, MantineTheme, Text, UnstyledButton, useMantineTheme } from '@mantine/core';
import { JobStatusEnum } from '@novu/shared';
import { format } from 'date-fns';
import styled from '@emotion/styled';
import { useClipboard } from '@mantine/hooks';

import { ActivityStep } from './ActivityStep';
import { DigestedStep } from './DigestedStep';

import { When } from '../../../components/utils/When';
import { CheckCircle, colors, ErrorIcon, Timer } from '@novu/design-system';
import { useNotificationStatus } from '../hooks/useNotificationStatus';
import { CopyButton } from './CopyButton';

const JOB_LENGTH_UPPER_THRESHOLD = 3;

const checkJobsLength = (item) => {
  return getJobsLength(item) > JOB_LENGTH_UPPER_THRESHOLD;
};

const getJobsLength = (item) => {
  let length = item.jobs.length;
  if (item._digestedNotificationId) {
    length = length + 1;
  }

  return length;
};

interface IUnstyledButtonProps {
  isOld: boolean;
}

const useStyles = createStyles(
  (theme: MantineTheme, { isOld }: IUnstyledButtonProps): Record<string, CSSObject> => ({
    unstyledButton: {
      width: '100%',
      cursor: isOld ? 'default' : 'pointer',
      '&:hover': {
        '[data-copy]': {
          visibility: 'visible',
        },
      },
    },
    copyButton: {
      display: 'inline',
      visibility: 'hidden',
      position: 'relative',
      top: '2px',
      marginLeft: '8px',
    },
  })
);

export const ActivityItem = ({ item, onClick }) => {
  const status = useNotificationStatus(item);
  const theme = useMantineTheme();
  const [isOld, setIsOld] = useState<boolean>(false);
  const [digestedNode, setDigestedNode] = useState<string>('');
  const { classes } = useStyles({ isOld });
  const { copy } = useClipboard();

  useEffect(() => {
    const details = item.jobs.reduce((items: any[], job) => [...items, ...job.executionDetails], []);
    if (item._digestedNotificationId !== null) {
      setDigestedNode(item._digestedNotificationId);
    }
    setIsOld(details.length === 0);
  }, [item]);

  return (
    <UnstyledButton onClick={isOld ? undefined : (event) => onClick(event, item.id)} className={classes.unstyledButton}>
      <ListItem dark={theme.colorScheme === 'dark'}>
        <Grid gutter={10}>
          <Grid.Col span={3}>
            <div
              style={{
                marginBottom: '16px',
              }}
            >
              <Grid align="center">
                <When truthy={!isOld}>
                  <Grid.Col
                    span={1}
                    sx={{
                      paddingRight: '30px',
                    }}
                  >
                    <span>
                      <When truthy={status !== JobStatusEnum.COMPLETED && status !== JobStatusEnum.FAILED}>
                        <Timer width={26} height={26} />
                      </When>
                      <When truthy={status === JobStatusEnum.COMPLETED}>
                        <CheckCircle width="26" height="26" color={colors.success} />
                      </When>
                      <When truthy={status === JobStatusEnum.FAILED}>
                        <ErrorIcon width="26" height="26" color={colors.error} />
                      </When>
                    </span>
                  </Grid.Col>
                </When>
                <Grid.Col span={10}>
                  <h3
                    style={{
                      margin: '0px',
                      marginBottom: '5px',
                    }}
                    data-test-id="row-template-name"
                  >
                    {item?.template?.name ? item.template.name : 'Deleted Template'}
                  </h3>
                  <When truthy={isOld}>
                    <Text>Done</Text>
                  </When>
                  <When truthy={!isOld}>
                    <When truthy={status === JobStatusEnum.COMPLETED}>
                      <Text data-test-id="status-badge-item" color={colors.success}>
                        Done
                      </Text>
                    </When>
                    <When truthy={status === JobStatusEnum.FAILED}>
                      <Text data-test-id="status-badge-item" color={colors.error}>
                        Failed
                      </Text>
                    </When>
                  </When>
                </Grid.Col>
              </Grid>
            </div>
            <div>
              <small>
                <b>Date:</b> {format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm')}
              </small>
              <div data-test-id="subscriber-id">
                <small>
                  <b>Subscriber id:</b>
                  {item?.subscriber?.subscriberId ? item.subscriber.subscriberId : 'Deleted Subscriber'}
                </small>
                {item?.subscriber?.subscriberId && (
                  <CopyButton className={classes.copyButton} onCopy={() => copy(item.subscriber.subscriberId)} />
                )}
              </div>
              <div data-test-id="transaction-id">
                <small>
                  <b>Transaction id:</b> {item.transactionId}
                </small>
                <CopyButton className={classes.copyButton} onCopy={() => copy(item.transactionId)} />
              </div>
            </div>
          </Grid.Col>
          <Grid.Col span={9}>
            <Grid
              columns={checkJobsLength(item) ? 10 : 12}
              justify="end"
              align="center"
              sx={{
                margin: 0,
                height: '100%',
              }}
            >
              {item.jobs.slice(0, JOB_LENGTH_UPPER_THRESHOLD).map((job) => (
                <ActivityStep
                  isOld={isOld}
                  key={`activity-step-${job._id}`}
                  span={checkJobsLength(item) ? 3 : 4}
                  job={job}
                />
              ))}
              <When truthy={!checkJobsLength(item) && digestedNode}>
                <DigestedStep digestedId={digestedNode} onClick={onClick} />
              </When>
              <When truthy={checkJobsLength(item)}>
                <Grid.Col span={1}>
                  <Text align="center" size="xl">
                    +{getJobsLength(item) - JOB_LENGTH_UPPER_THRESHOLD}
                  </Text>
                </Grid.Col>
              </When>
            </Grid>
          </Grid.Col>
        </Grid>
      </ListItem>
    </UnstyledButton>
  );
};

const ListItem = styled.div<{ dark: boolean }>`
  padding: 20px;
  padding-left: 15px;
  margin-left: 30px;
  margin-right: 30px;
  border: 1px solid ${({ dark }) => (dark ? colors.B30 : colors.B80)};
  margin-bottom: 15px;
  border-radius: 7px;
  color: ${({ dark }) => (dark ? colors.B80 : colors.B40)};

  &:hover {
    background-color: ${({ dark }) => (dark ? colors.B20 : colors.BGLight)};
    border-radius: 7px;
  },
`;
