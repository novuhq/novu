import {
  IconOutlineSms,
  IconOutlineEmail,
  IconOutlineChat,
  IconOutlineInbox,
  IconAdUnits,
  IconAutoAwesomeMotion,
  IconTimer,
  IconCode,
} from '@novu/novui/icons';

const iconFromStepType = {
  in_app: IconOutlineInbox,
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
