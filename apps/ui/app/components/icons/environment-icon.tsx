import { IconConstruction, IconOutlineRocketLaunch } from '@novu/novui/icons';

const iconFromEnvironment = {
  Development: IconConstruction,
  Production: IconOutlineRocketLaunch,
};

export const EnvironmentIcon = ({
  environment,
  ...props
}: { environment: keyof typeof iconFromEnvironment } & React.ComponentPropsWithoutRef<'svg'>) => {
  const IconComponent = iconFromEnvironment[environment];

  return <IconComponent {...props} />;
};
