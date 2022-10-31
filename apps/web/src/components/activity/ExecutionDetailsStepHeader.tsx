import { Container, Grid, useMantineColorScheme } from '@mantine/core';
import { ChannelTypeEnum, ExecutionDetailsStatusEnum, StepTypeEnum, DelayTypeEnum } from '@novu/shared';
import { format, parseISO } from 'date-fns';
import styled from 'styled-components';

import { ExecutionDetailsWebhookFeedback } from './ExecutionDetailsWebhookFeedback';
import { getLogoByType } from './helpers';

import { colors, Text } from '../../design-system';
import { CheckCircle, ErrorIcon } from '../../design-system/icons';

const StepName = styled(Text)<{ theme: string }>`
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B40)};
  font-size: 16px;
  font-weight: 700;
  line-height: 17px;
  padding-bottom: 5px;
  padding-top: 0;
  text-transform: capitalize;
`;

const StepDetails = styled(Text)<{ theme: string }>`
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B60)};
  font-size: 12px;
  line-height: 16px;
  padding: 0;
`;

const StepDate = styled(Text)<{ theme: string }>`
  color: ${colors.B60};
  font-size: 12px;
  line-height: 16px;
  padding: 3px 0 0;
`;

const FailedStepDetails = styled(StepDetails)`
  color: ${colors.error};
`;

const SuccessStepDetails = styled(StepDetails)`
  color: ${colors.success};
`;

const LogoWrapper = styled(Container)`
  max-width: 50px;
  padding: 10px 10px 0 0;
  position: relative;
`;

const getLogoStyledComponentByStepStatus = (status, type) => {
  if (status === ExecutionDetailsStatusEnum.SUCCESS) {
    return CheckCircle;
  }

  return getLogoByType(type);
};

const getColorByStatus = (status) => {
  if (status === ExecutionDetailsStatusEnum.SUCCESS) {
    return colors.success;
  }

  return undefined;
};

const StepLogo = ({ status, type }) => {
  const Logo = getLogoStyledComponentByStepStatus(status, type);
  const color = getColorByStatus(status);

  return (
    <LogoWrapper>
      {Logo && <Logo height="32px" width="32px" color={color} />}
      {status === ExecutionDetailsStatusEnum.FAILED && (
        <ErrorIcon
          height="15px"
          width="15px"
          color={colors.error}
          style={{ position: 'relative', left: '20px', top: '-15px' }}
        />
      )}
    </LogoWrapper>
  );
};

const getSuccessMessageByStepType = (type: StepTypeEnum) => {
  const defaultMessage = 'Success! The notification has been delivered.';

  const messages = {
    [StepTypeEnum.DIGEST]: 'Finished digesting events!',
    [StepTypeEnum.DELAY]: 'Notification triggered after the delay.',
  };

  return messages[type] ?? defaultMessage;
};

const generateDetailByStepAndStatus = (status, step) => {
  if (status === ExecutionDetailsStatusEnum.SUCCESS) {
    return getSuccessMessageByStepType(step.type);
  }

  if (step.type === StepTypeEnum.DIGEST) {
    const { digest } = step;

    return `${digest.amount} ${digest.unit}`;
  }

  if (step.type === StepTypeEnum.DELAY) {
    const { digest, step: stepMetadata, payload } = step;
    if (stepMetadata.metadata.type === DelayTypeEnum.SCHEDULED) {
      return `Delay to ${payload[stepMetadata.metadata.delayPath]}`;
    }

    return `${digest.amount} ${digest.unit}`;
  }

  return step.executionDetails?.at(-1)?.detail;
};

const getDetailsStyledComponentByStepStatus = (status) => {
  if (status === ExecutionDetailsStatusEnum.SUCCESS) {
    return SuccessStepDetails;
  }

  if (status === ExecutionDetailsStatusEnum.FAILED) {
    return FailedStepDetails;
  }

  return StepDetails;
};

const StepOutcome = ({ createdAt, name, detail, status }) => {
  const theme = useMantineColorScheme();
  const Details = getDetailsStyledComponentByStepStatus(status);
  const date = format(parseISO(createdAt), 'dd/MM/yyyy');

  return (
    <>
      <StepName theme={theme}>{name?.replace('_', ' ')}</StepName>
      <Details theme={theme}>{detail}</Details>
      <StepDate theme={theme}>{date}</StepDate>
    </>
  );
};

export const ExecutionDetailsStepHeader = ({ step }) => {
  const { status } = step?.executionDetails.at(-1) || {};
  const generatedDetail = generateDetailByStepAndStatus(status, step);

  return (
    <Grid>
      <Grid.Col span={1}>
        <StepLogo status={status} type={step.type} />
      </Grid.Col>
      <Grid.Col span={7}>
        <StepOutcome createdAt={step?.createdAt} name={step?.type} detail={generatedDetail} status={status} />
      </Grid.Col>
      <Grid.Col span={4}>
        <ExecutionDetailsWebhookFeedback show={false} />
      </Grid.Col>
    </Grid>
  );
};
