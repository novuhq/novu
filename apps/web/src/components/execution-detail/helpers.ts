import { ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';
import { MantineTheme } from '@mantine/core';
import {
  colors,
  Chat,
  Check,
  CheckCircle,
  Clicked,
  Digest,
  ErrorIcon,
  InApp,
  Mail,
  Mobile,
  Read,
  Received,
  Seen,
  Sent,
  Sms,
  Timer,
  WarningIcon,
} from '@novu/design-system';

export const getColorByStatus = (theme: MantineTheme, status: ExecutionDetailsStatusEnum): string => {
  if (status === ExecutionDetailsStatusEnum.FAILED) {
    return colors.error;
  }

  if (status === ExecutionDetailsStatusEnum.SUCCESS) {
    return colors.success;
  }

  return theme.colorScheme === 'dark' ? colors.B60 : colors.B40;
};

export const getLogoByStatus = (
  status: ExecutionDetailsStatusEnum
): React.FunctionComponent<React.ComponentPropsWithoutRef<'svg'>> => {
  switch (status) {
    case ExecutionDetailsStatusEnum.SUCCESS:
      return CheckCircle;
    case ExecutionDetailsStatusEnum.WARNING:
      return WarningIcon;
    case ExecutionDetailsStatusEnum.FAILED:
      return ErrorIcon;
    default:
      return Check;
  }
};

export const getLogoByType = (
  type: StepTypeEnum
): React.FunctionComponent<React.ComponentPropsWithoutRef<'svg'>> | null => {
  if (type === StepTypeEnum.DELAY) {
    return Timer;
  }

  if (type === StepTypeEnum.DIGEST) {
    return Digest;
  }

  if (type === StepTypeEnum.EMAIL) {
    return Mail;
  }

  if (type === StepTypeEnum.SMS) {
    return Sms;
  }

  if (type === StepTypeEnum.IN_APP) {
    return InApp;
  }

  if (type === StepTypeEnum.CHAT) {
    return Chat;
  }

  if (type === StepTypeEnum.PUSH) {
    return Mobile;
  }

  return null;
};

export const mappedWebhookStatuses = {
  sent: { label: 'Sent', icon: Sent, status: ['processed'] },
  received: { label: 'Received', icon: Received, status: ['delivered'] },
  read: { label: 'Read', icon: Read, status: [] },
  seen: { label: 'Seen', icon: Seen, status: ['open'] },
  clicked: { label: 'Clicked', icon: Clicked, status: ['click'] },
};
