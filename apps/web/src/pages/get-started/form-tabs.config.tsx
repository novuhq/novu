import {
  IconSettings,
  IconLaptopMac,
  IconOutlineCloudUpload,
  IconOutlineRocketLaunch,
  IconGroup,
} from '@novu/novui/icons';
import { SetupTab } from './tabs/Setup';
import { CodeSnippet } from './legacy-onboarding/components/CodeSnippet';
import { css } from '@novu/novui/css';
import { DeployTab } from './tabs/Deploy';
import { collaborateSteps } from './tabs/Collaborate';

const iconStyles = css({
  width: '24px',
  height: '24px',
});

export const onboardingTabs = [
  {
    icon: <IconLaptopMac className={iconStyles} />,
    stepperTitle: 'Build',
    content: <SetupTab />,
    title: 'Build your first flow',
  },
  {
    icon: <IconOutlineCloudUpload className={iconStyles} />,
    stepperTitle: 'Deploy',
    content: <DeployTab />,
    title: 'Push your flow to the cloud',
  },
  {
    icon: <IconGroup className={iconStyles} />,
    stepperTitle: 'Collaborate',
    steps: collaborateSteps,
    title: 'Collaborate with your team',
  },
];
