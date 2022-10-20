import { Grid, Text } from '@mantine/core';
import styled from 'styled-components';
import { format, isValid, parseISO } from 'date-fns';
import { ExecutionDetailsStatusEnum } from '@novu/shared';

import { colors, shadows } from '../../design-system';
import { Chat, CheckCircle, InApp, Mail, Sms, Timer } from '../../design-system/icons';

// TODO: Delete once components done
const doStep = (number, status, detail) => ({
  _id: number,
  logo: 'logo',
  name: `step-${number}`,
  detail,
  createdAt: new Date().toISOString(),
  status,
});
const stops = [
  doStep(1, 'Failed', 'Failure short description'),
  doStep(2, 'Pending', 'This step is scheduled to be triggered in 54 minutes (action: delay)'),
  doStep(3, 'Success', 'Success! The notification has been delivered'),
  doStep(4, 'Pending', 'This step is scheduled to be triggered in 54 minutes (action: delay)'),
];

const stops2 = [
  {
    _id: '63513bd4c17b80d9605fa955',
    _jobId: '63513bd4c17b80d9605fa94c',
    _environmentId: '6345abcbed568615629dc2c4',
    _organizationId: '6345abcbed568615629dc2b2',
    _notificationId: '63513bd4c17b80d9605fa946',
    _notificationTemplateId: '63467c6302e611fbc7a5d751',
    _subscriberId: '6345b543165d1014fd936f1c',
    providerId: 'sendgrid',
    transactionId: 'cd4d3cbe-20f7-47ed-ad3b-9d14a38afae6',
    channel: 'email',
    detail: 'Step is queued for execution',
    source: 'Internal',
    status: 'Pending',
    isTest: false,
    isRetry: false,
    createdAt: '2022-10-20T12:15:16.869Z',
    updatedAt: '2022-10-20T12:15:16.869Z',
    __v: 0,
    id: '63513bd4c17b80d9605fa955',
  },
  {
    _id: '63513bd4c17b80d9605fa959',
    _jobId: '63513bd4c17b80d9605fa94c',
    _environmentId: '6345abcbed568615629dc2c4',
    _organizationId: '6345abcbed568615629dc2b2',
    _notificationId: '63513bd4c17b80d9605fa946',
    _notificationTemplateId: '63467c6302e611fbc7a5d751',
    _subscriberId: '6345b543165d1014fd936f1c',
    providerId: 'sendgrid',
    transactionId: 'cd4d3cbe-20f7-47ed-ad3b-9d14a38afae6',
    channel: 'email',
    detail: 'Step was filtered based on steps filters',
    source: 'Internal',
    status: 'Pending',
    isTest: false,
    isRetry: false,
    raw: `{\'payload\':{\'payload\':{}},\'filters\':[{\'children\':[],\'_id\:\'63467dc102e611fbc7a5d7f7\'}]}`,
    createdAt: '2022-10-20T12:15:16.928Z',
    updatedAt: '2022-10-20T12:15:16.928Z',
    __v: 0,
    id: '63513bd4c17b80d9605fa959',
  },
  {
    _id: '63513bd4c17b80d9605fa960',
    _jobId: '63513bd4c17b80d9605fa94c',
    _environmentId: '6345abcbed568615629dc2c4',
    _organizationId: '6345abcbed568615629dc2b2',
    _notificationId: '63513bd4c17b80d9605fa946',
    _notificationTemplateId: '63467c6302e611fbc7a5d751',
    _subscriberId: '6345b543165d1014fd936f1c',
    providerId: 'sendgrid',
    transactionId: 'cd4d3cbe-20f7-47ed-ad3b-9d14a38afae6',
    channel: 'email',
    detail: 'Start sending message',
    source: 'Internal',
    status: 'Pending',
    isTest: false,
    isRetry: false,
    createdAt: '2022-10-20T12:15:16.948Z',
    updatedAt: '2022-10-20T12:15:16.948Z',
    __v: 0,
    id: '63513bd4c17b80d9605fa960',
  },
  {
    _id: '63513bd5c17b80d9605fa968',
    _jobId: '63513bd4c17b80d9605fa94c',
    _environmentId: '6345abcbed568615629dc2c4',
    _organizationId: '6345abcbed568615629dc2b2',
    _notificationId: '63513bd4c17b80d9605fa946',
    _notificationTemplateId: '63467c6302e611fbc7a5d751',
    _subscriberId: '6345b543165d1014fd936f1c',
    _messageId: '63513bd4c17b80d9605fa966',
    providerId: 'sendgrid',
    transactionId: 'cd4d3cbe-20f7-47ed-ad3b-9d14a38afae6',
    channel: 'email',
    detail: 'Message created',
    source: 'Internal',
    status: 'Pending',
    isTest: false,
    isRetry: false,
    raw: '{}',
    createdAt: '2022-10-20T12:15:17.048Z',
    updatedAt: '2022-10-20T12:15:17.048Z',
    __v: 0,
    id: '63513bd5c17b80d9605fa968',
  },
  {
    _id: '63513bd5c17b80d9605fa96a',
    _jobId: '63513bd4c17b80d9605fa94c',
    _environmentId: '6345abcbed568615629dc2c4',
    _organizationId: '6345abcbed568615629dc2b2',
    _notificationId: '63513bd4c17b80d9605fa946',
    _notificationTemplateId: '63467c6302e611fbc7a5d751',
    _subscriberId: '6345b543165d1014fd936f1c',
    _messageId: '63513bd4c17b80d9605fa966',
    providerId: 'sendgrid',
    transactionId: 'cd4d3cbe-20f7-47ed-ad3b-9d14a38afae6',
    channel: 'email',
    detail: 'Subscriber does not have any email/phone number',
    source: 'Internal',
    status: 'Failed',
    isTest: false,
    isRetry: false,
    createdAt: '2022-10-20T12:15:17.073Z',
    updatedAt: '2022-10-20T12:15:17.073Z',
    __v: 0,
    id: '63513bd5c17b80d9605fa96a',
  },
  {
    _id: '63513bd5c17b80d9605fa96d',
    _jobId: '63513bd4c17b80d9605fa94c',
    _environmentId: '6345abcbed568615629dc2c4',
    _organizationId: '6345abcbed568615629dc2b2',
    _notificationId: '63513bd4c17b80d9605fa946',
    _notificationTemplateId: '63467c6302e611fbc7a5d751',
    _subscriberId: '6345b543165d1014fd936f1c',
    _messageId: '63513bd4c17b80d9605fa966',
    providerId: 'sendgrid',
    transactionId: 'cd4d3cbe-20f7-47ed-ad3b-9d14a38afae6',
    channel: 'email',
    detail: 'Subscriber does not have an email address',
    source: 'Internal',
    status: 'Failed',
    isTest: false,
    isRetry: false,
    createdAt: '2022-10-20T12:15:17.079Z',
    updatedAt: '2022-10-20T12:15:17.079Z',
    __v: 0,
    id: '63513bd5c17b80d9605fa96d',
  },
];

// TODO: Deletion up to here up ^^^^^^^^^^^^

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

/**
 * TODO: It should be an icon for an arrow but I haven't found it
 * so doing it CSS wise
 */
const Separator = styled.div`
  border: 1px dashed ${colors.white};
  border-radius: 10px;
  height: 1px;
  opacity: 0.8;
  position: relative;
  top: 13px;
  width: 25px;
`;

const StepName = styled.div`
  color: ${colors.white};
  font-size: 16px;
  font-weight: 700;
  line-height: 17px;
  padding-bottom: 5px;
  padding-top: 0;
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
  width: 110px;
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

/**
 * TODO: Steps are not coming with a name. That's the reason
 * I am feeding them with the notificationId as fallback.
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

const StepTime = ({ value }) => {
  // Steps happen rightly after each other. We need milliseconds to help users debug properly.
  const formattedTime = format(parseISO(value), 'HH:mm:ss.SSS');

  return (
    <StepTimeWrapper>
      <TimeWrapper>
        <FormattedTime>{formattedTime}</FormattedTime>
        <IconTime>
          <CheckCircle height="12" width="12" color={colors.white} />
        </IconTime>
      </TimeWrapper>
      <TimeWrapperDetail>This happened</TimeWrapperDetail>
    </StepTimeWrapper>
  );
};

/**
 * TODO: We need to manipulate the given data to bring the last 3 timestamps of the steps
 * so we can do the proposal properly. So far I feed the data for all rows.
 */
const StepTimeFlow = ({ value }) => {
  const length = 3;
  const times: number[] = Array.from({ length }, (_, i) => i + 1);

  return (
    <StepTimeFlowWrapper>
      {times.map((index: number) => (
        <>
          <StepTime value={value} />
          {index < length && <Separator />}
        </>
      ))}
    </StepTimeFlowWrapper>
  );
};

const ExecutionDetailsStepWrapper = ({ step }) => {
  const Component = getStyledComponentByStepStatus(step.status);

  return (
    <Component key={`execution-details-wrapper-component-${step._id}`}>
      <Grid gutter={10}>
        <Grid.Col span={1}>
          <StepLogo channel={step.channel} status={step.status} />
        </Grid.Col>
        <Grid.Col span={5}>
          <StepOutcome name={step.name || step._jobId} detail={step.detail} status={step.status} />
        </Grid.Col>
        <Grid.Col span={6}>
          <StepTimeFlow value={step.createdAt} />
        </Grid.Col>
      </Grid>
    </Component>
  );
};

export const ExecutionDetailsSteps = ({ steps = [] }) => {
  if (stops.length === 0) {
    return null;
  }

  return (
    <>
      {stops.map((step) => (
        <ExecutionDetailsStepWrapper key={`execution-details-wrapper-${step._id}`} step={step} />
      ))}
    </>
  );
};
