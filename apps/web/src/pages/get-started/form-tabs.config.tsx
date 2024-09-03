import { IconLaptopMac, IconOutlineCloudUpload, IconGroup } from '@novu/novui/icons';
import { css } from '@novu/novui/css';
import { SetupTab } from './tabs/Setup';
import { DeployTab } from './tabs/Deploy';
import { collaborateSteps } from './tabs/Collaborate';

const iconStyles = css({
  width: '24px',
  height: '24px',
});

export const onboardingTabs = [
  {
    title: 'Build your first workflow',
    description: 'Build and test your first workflow in Novu Studio',
    icon: <IconLaptopMac className={iconStyles} />,
    stepperTitle: 'Build',
    content: <SetupTab />,
  },
  {
    title: 'Push your flow to the cloud',
    description: 'Publish your changes to share with your team',
    icon: <IconOutlineCloudUpload className={iconStyles} />,
    stepperTitle: 'Deploy',
    content: <DeployTab />,
  },
  {
    title: 'Collaborate with your team',
    description: 'Enable your team members to modify notification content',
    icon: <IconGroup className={iconStyles} />,
    stepperTitle: 'Collaborate',
    steps: collaborateSteps,
  },
];
