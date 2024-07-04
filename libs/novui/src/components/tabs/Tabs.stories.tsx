import { StoryFn, Meta } from '@storybook/react';
import React, { ReactNode } from 'react';
import { IconOutlineCode, IconOutlineMiscellaneousServices, IconOutlineVisibility } from '../../icons';
import { LocalizedMessage } from '../../types';

import { Tabs } from './Tabs';

export default {
  title: 'Components/Tabs',

  component: Tabs,

  argTypes: {
    colorPalette: {
      options: ['mode.cloud', 'mode.local'],
      control: { type: 'select' },
    },
  },
} as Meta<typeof Tabs>;

const Template: StoryFn<typeof Tabs> = ({ ...args }) => <Tabs {...args} />;

enum TestTabEnum {
  PREVIEW = 'preview',
  CODE = 'code',
  RANDOM = 'random',
}

const LABELS: Record<TestTabEnum, LocalizedMessage> = {
  [TestTabEnum.PREVIEW]: 'Preview',
  [TestTabEnum.CODE]: 'Code',
  [TestTabEnum.RANDOM]: 'Random',
};

const ICONS: Record<TestTabEnum, ReactNode> = {
  [TestTabEnum.PREVIEW]: <IconOutlineVisibility />,
  [TestTabEnum.CODE]: <IconOutlineCode />,
  [TestTabEnum.RANDOM]: <IconOutlineMiscellaneousServices />,
};

export const Default = Template.bind({});
Default.args = {
  tabConfigs: Object.values(TestTabEnum).map((value) => ({
    value,
    label: LABELS[value],
    content: LABELS[value],
  })),
  defaultValue: TestTabEnum.CODE,
};

export const HorizontalTabMenuWithIcon = Template.bind({});
HorizontalTabMenuWithIcon.args = {
  tabConfigs: Object.values(TestTabEnum).map((value) => ({
    value,
    label: LABELS[value],
    content: LABELS[value],
    icon: ICONS[value],
  })),
  defaultValue: TestTabEnum.RANDOM,
};
