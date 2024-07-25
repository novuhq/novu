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
    description: 'Build and test your first workflow in Novu Studio',
    title: 'Build your first workflow',
  },
  {
    icon: <IconOutlineCloudUpload className={iconStyles} />,
    stepperTitle: 'Deploy',
    content: <DeployTab />,
    description: 'Publish your changes to share with your team',
    title: 'Push your flow to the cloud',
  },
  {
    icon: <IconGroup className={iconStyles} />,
    stepperTitle: 'Collaborate',
    steps: collaborateSteps,
    description: 'Enable your team members to modify notification content',
    title: 'Collaborate with your team',
  },
];
