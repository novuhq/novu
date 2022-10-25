import { Grid, Text } from '@mantine/core';
import styled from 'styled-components';
import { format, isValid, parseISO } from 'date-fns';
import { ExecutionDetailsStatusEnum } from '@novu/shared';

import { colors, shadows } from '../../design-system';
import { Chat, CheckCircle, InApp, Mail, Sms, Timer } from '../../design-system/icons';

const ExecutionDetailsStepItem = styled.div`
  padding: 20px;
  padding-left: 15px;
  border: 1px solid ${colors.B30};
  margin-bottom: 15px;
  border-radius: 7px;
  color: ${colors.B80};
`;

const ExecutionDetailsStepFailed = styled(ExecutionDetailsStepItem)`
  background: rgba(230, 69, 69, 0.15);
  border: 1px solid ${colors.error};
`;

const ExecutionDetailsStepSuccess = styled(ExecutionDetailsStepItem)`
  background: rgba(77, 153, 128, 0.15);
  border: 1px solid ${colors.success};
`;

const StepTimeFlowWrapper = styled.div`
  display: flex;
  justify-content: flex-end;
  margin: 0 5px;
  padding: 0;
  &:last-child {
    margin: 0 0 0 5px;
  }
`;

const StepTimeWrapper = styled(StepTimeFlowWrapper)`
  flex-flow: column;
`;

interface ISeparator {
  show: boolean;
}

/**
 * TODO: It should be an icon for an arrow but I haven't found it
 * so doing it CSS wise
 */
const Separator = styled.div<ISeparator>`
  border: 1px dashed ${colors.white};
  border-radius: 10px;
  height: 1px;
  opacity: 0.8;
  position: relative;
  top: 13px;
  visibility: ${(props) => (props.show ? 'visible' : 'hidden')};
  width: 30px;
`;

const StepName = styled.div`
  color: ${colors.white};
  font-size: 16px;
  font-weight: 700;
  line-height: 17px;
  padding-bottom: 5px;
  padding-top: 0;
  text-transform: capitalize;
`;

const StepDetails = styled.div`
  color: ${colors.white};
  font-size: 12px;
  line-height: 16px;
`;

const FailedStepDetails = styled(StepDetails)`
  color: ${colors.error};
`;

const SuccessStepDetails = styled(StepDetails)`
  color: ${colors.success};
`;

const FormattedTime = styled.div`
  color: ${colors.white};
  font-size: 12px;
  padding: 0;
`;

const IconTime = styled.div`
  padding: 0 5px;
  width: 12px;
`;

const TimeWrapper = styled.div`
  border: 1px solid ${colors.B60};
  border-radius: 20px;
  display: flex;
  justify-content: center;
  padding: 5px;
  width: 70px;
`;

const TimeWrapperDetail = styled.div`
  justify-content: center;
  margin: 0;
  opacity: 0.8;
  padding: 0 10px;
`;

const getStyledComponentByStepStatus = (status) => {
  if (status === ExecutionDetailsStatusEnum.SUCCESS) {
    return ExecutionDetailsStepSuccess;
  }

  if (status === ExecutionDetailsStatusEnum.FAILED) {
    return ExecutionDetailsStepFailed;
  }

  return ExecutionDetailsStepItem;
};

const getLogoStyledComponentByStepStatus = (channel, status) => {
  if (status === ExecutionDetailsStatusEnum.SUCCESS) {
    return CheckCircle;
  }

  if (status === ExecutionDetailsStatusEnum.FAILED) {
    if (channel === 'email') {
      return Mail;
    }
    if (channel === 'sms') {
      return Sms;
    }
    if (channel === 'inApp') {
      return InApp;
    }
    if (channel === 'chat') {
      return Chat;
    }

    return Mail;
  }

  // TODO: Depending on the channel we might need to add the Digest logo here.
  return Timer;
};

const getColorByStatus = (status) => {
  if (status === ExecutionDetailsStatusEnum.SUCCESS) {
    return colors.success;
  }

  if (status === ExecutionDetailsStatusEnum.FAILED) {
    return colors.error;
  }

  return undefined;
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

const StepLogo = ({ channel, status }) => {
  const Logo = getLogoStyledComponentByStepStatus(channel, status);
  const color = getColorByStatus(status);

  return <Logo height="32" width="32" color={color} />;
};

const generateDetailByStepAndStatus = (status, step) => {
  if (status === ExecutionDetailsStatusEnum.SUCCESS) {
    return 'Success! The notification has been delivered.';
  }

  if (step.type === 'digest') {
    const { digest } = step;

    return `${digest.amount} ${digest.unit}`;
  }

  if (step.type === 'delay') {
    const { digest } = step;

    return `${digest.amount} ${digest.unit}`;
  }

  return step.executionDetails.at(-1).detail;
};

/**
 * Step name is the type of job provided (either channel or digest/delay).
 * TODO: Jobs have no details. Which detail should we fill?
 */
const StepOutcome = ({ name, detail, status }) => {
  const Details = getDetailsStyledComponentByStepStatus(status);

  return (
    <>
      <StepName>{name}</StepName>
      <Details>{detail}</Details>
    </>
  );
};

const StepTimeAndDetail = ({ createdAt, detail }) => {
  const formattedTime = format(parseISO(createdAt), 'HH:mm');

  return (
    <StepTimeWrapper>
      <TimeWrapper>
        <FormattedTime>{formattedTime}</FormattedTime>
        <IconTime>
          <CheckCircle height="12" width="12" color={colors.white} />
        </IconTime>
      </TimeWrapper>
      <TimeWrapperDetail>{detail}</TimeWrapperDetail>
    </StepTimeWrapper>
  );
};

const StepTimeFlow = ({ executionDetails }) => {
  if (executionDetails?.length <= 0) {
    return null;
  }

  const numberOfExecutionDetails = 3;

  return (
    <StepTimeFlowWrapper>
      {executionDetails.slice(-numberOfExecutionDetails).map((executionDetail, index) => (
        <>
          <StepTimeAndDetail createdAt={executionDetail.createdAt} detail={executionDetail.detail} />
          <Separator show={index < numberOfExecutionDetails - 1} />
        </>
      ))}
    </StepTimeFlowWrapper>
  );
};

const ExecutionDetailsStepWrapper = ({ step }) => {
  // TODO: Status of job would be the status of the last execution details
  const { status } = step?.executionDetails.at(-1) || {};
  const Component = getStyledComponentByStepStatus(status);

  const generatedDetail = generateDetailByStepAndStatus(status, step);

  return (
    <Component key={`execution-details-wrapper-component-${step._id}`}>
      <Grid gutter={10}>
        <Grid.Col span={1}>
          <StepLogo channel={step.channel} status={status} />
        </Grid.Col>
        <Grid.Col span={5}>
          <StepOutcome name={step.type} detail={generatedDetail} status={status} />
        </Grid.Col>
        <Grid.Col span={6}>
          <StepTimeFlow executionDetails={step.executionDetails} />
        </Grid.Col>
      </Grid>
    </Component>
  );
};

export const ExecutionDetailsSteps = ({ steps = [] }) => {
  if (steps.length === 0) {
    return null;
  }

  return (
    <>
      {steps.map((step: any) => (
        <ExecutionDetailsStepWrapper key={`execution-details-wrapper-${step.id}`} step={step} />
      ))}
    </>
  );
};
