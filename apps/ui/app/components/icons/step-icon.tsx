import {
  IconOutlineSms,
  IconOutlineEmail,
  IconOutlineChat,
  IconNotificationsNone,
  IconAdUnits,
  IconAutoAwesomeMotion,
  IconTimer,
  IconCode,
} from '@novu/novui/icons';

const iconFromStepType = {
  in_app: IconNotificationsNone,
  email: IconOutlineEmail,
  sms: IconOutlineSms,
  chat: IconOutlineChat,
  push: IconAdUnits,
  digest: IconAutoAwesomeMotion,
  delay: IconTimer,
  custom: IconCode,
};

export const StepIcon = ({ type }: { type: keyof typeof iconFromStepType }) => {
  return iconFromStepType[type]();
};
