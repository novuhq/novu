import { Grid, Text, useMantineTheme } from '@mantine/core';
import { JobStatusEnum, StepTypeEnum } from '@novu/shared';
import * as capitalize from 'lodash.capitalize';
import styled from '@emotion/styled';
import {
  colors,
  shadows,
  CheckCircle,
  ErrorIcon,
  Digest,
  Mail,
  Mobile,
  Chat,
  Sms,
  InApp,
  Timer,
} from '@novu/design-system';
import { When } from '../../../components/utils/When';

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

export const ActivityStep = ({ job, span = 4, isOld }) => {
  const status = job.status;
  const theme = useMantineTheme();

  return (
    <Grid.Col
      span={span}
      sx={{
        padding: 0,
        paddingLeft: '10px',
        height: '100%',
      }}
    >
      <StepItem dark={theme.colorScheme === 'dark'} data-test-id={`${job.type}-step`}>
        <Grid
          sx={{
            margin: 0,
          }}
        >
          <When truthy={!isOld}>
            <span
              style={{
                marginRight: '8px',
              }}
            >
              <When truthy={status !== JobStatusEnum.COMPLETED && status !== JobStatusEnum.FAILED}>
                <Timer width={16} height={16} />
              </When>
              <When truthy={status === JobStatusEnum.COMPLETED}>
                <CheckCircle width="16" height="16" color={colors.success} />
              </When>
              <When truthy={status === JobStatusEnum.FAILED}>
                <ErrorIcon width="16" height="16" color={colors.error} />
              </When>
            </span>
          </When>
          <When truthy={!isOld}>
            <Header
              dark={theme.colorScheme === 'dark'}
              done={status === JobStatusEnum.COMPLETED}
              failed={status === JobStatusEnum.FAILED}
            >
              {capitalize(job.type?.replace('_', ' '))}
            </Header>
          </When>
          <When truthy={isOld}>
            <Header dark={theme.colorScheme === 'dark'} done={false} failed={false}>
              {capitalize(job.type?.replace('_', ' '))}
            </Header>
          </When>
          <span
            style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
            }}
          >
            <TypeIcon type={job.type} />
          </span>
        </Grid>
        <Text
          sx={{
            color: theme.colorScheme === 'dark' ? colors.B80 : colors.B40,
            fontSize: '12px',
            position: 'absolute',
            left: '15px',
            bottom: '15px',
            right: '15px',
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
  position: relative;
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
  margin-bottom: 16px;
`;
