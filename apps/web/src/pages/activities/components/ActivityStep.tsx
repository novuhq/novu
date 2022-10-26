import { Grid, Text, useMantineTheme } from '@mantine/core';
import * as capitalize from 'lodash.capitalize';
import { useJobStatus } from '../hooks/useJobStatus';
import { colors, shadows } from '../../../design-system';
import styled from 'styled-components';
import { CheckCircle, ErrorIcon } from '../../../design-system/icons';
import { When } from '../../../components/utils/When';
import { ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';
import { Digest } from '../../../design-system/icons/general/Digest';
import { Mail, Mobile, Chat, Sms, InApp, Timer } from '../../../design-system/icons';

const TypeIcon = ({ type }: { type: StepTypeEnum }) => {
  const theme = useMantineTheme();

  switch (type) {
    case StepTypeEnum.EMAIL:
      return <Mail width={22} height={22} />;
    case StepTypeEnum.SMS:
      return <Sms width={22} height={22} />;
    case StepTypeEnum.CHAT:
      return <Chat width={22} height={22} />;
    case StepTypeEnum.PUSH:
      return <Mobile width={22} height={22} />;
    case StepTypeEnum.IN_APP:
      return <InApp width={22} height={22} />;
    case StepTypeEnum.DIGEST:
      return (
        <div style={{ zoom: 0.65, width: 28, marginLeft: 4 }}>
          <Digest color={theme.colorScheme === 'dark' ? colors.B80 : colors.B40} />
        </div>
      );
    case StepTypeEnum.DELAY:
      return <Timer width={22} height={22} />;
    default:
      return null;
  }
};

export const ActivityStep = ({ job, span = 4 }) => {
  const status = useJobStatus(job);
  const theme = useMantineTheme();

  return (
    <Grid.Col
      span={span}
      sx={{
        padding: 0,
        paddingLeft: '10px',
      }}
    >
      <StepItem dark={theme.colorScheme === 'dark'} data-test-id={`${job.type}-step`}>
        <Grid>
          <Grid.Col span={1}>
            <When
              truthy={status !== ExecutionDetailsStatusEnum.SUCCESS && status !== ExecutionDetailsStatusEnum.FAILED}
            >
              <Timer width={16} height={16} />
            </When>
            <When truthy={status === ExecutionDetailsStatusEnum.SUCCESS}>
              <CheckCircle width="16" height="16" color={colors.success} />
            </When>
            <When truthy={status === ExecutionDetailsStatusEnum.FAILED}>
              <ErrorIcon width="16" height="16" color={colors.error} />
            </When>
          </Grid.Col>
          <Grid.Col span={8}>
            <Header
              dark={theme.colorScheme === 'dark'}
              done={status === ExecutionDetailsStatusEnum.SUCCESS}
              failed={status === ExecutionDetailsStatusEnum.FAILED}
            >
              {capitalize(job.type)}
            </Header>
          </Grid.Col>
          <Grid.Col
            span={2}
            sx={{
              textAlign: 'right',
            }}
          >
            <TypeIcon type={job.type} />
          </Grid.Col>
        </Grid>
        <Text
          sx={{
            color: theme.colorScheme === 'dark' ? colors.B80 : colors.B40,
            fontSize: '12px',
          }}
        >
          {job.executionDetails?.at(-1)?.detail}
        </Text>
      </StepItem>
    </Grid.Col>
  );
};

const StepItem = styled.div<{ dark: boolean }>`
  background: ${({ dark }) => (dark ? colors.B20 : colors.B98)};
  padding: 15px;
  box-shadow: ${({ dark }) => (dark ? shadows.dark : 'none')};
  border-radius: 7px;
  height: 100%;
  width: 100%;
`;

const Header = styled.h4<{ done: boolean; failed; dark: boolean }>`
  color: ${({ done, failed, dark }) => {
    if (failed) {
      return colors.error;
    }

    if (done) {
      return colors.success;
    }

    return dark ? colors.white : colors.B40;
  }};
  margin-top: 0px;
`;
