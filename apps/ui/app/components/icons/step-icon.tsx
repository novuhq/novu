import {
  IconOutlineSms,
  IconOutlineEmail,
  IconOutlineChat,
  IconNotificationsNone,
  IconAdUnits,
  IconAutoAwesomeMotion,
  IconOutlineTimer,
  IconCode,
} from '@novu/novui/icons';

const iconFromStepType = {
  in_app: IconNotificationsNone,
  email: IconOutlineEmail,
  sms: IconOutlineSms,
  chat: IconOutlineChat,
  push: IconAdUnits,
  digest: IconAutoAwesomeMotion,
  delay: IconOutlineTimer,
  custom: IconCode,
};

export const StepIcon = ({
  type,
  ...props
}: { type: keyof typeof iconFromStepType } & React.ComponentPropsWithoutRef<'svg'>) => {
  const IconComponent = iconFromStepType[type];

  return <IconComponent {...props} />;
};
