import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Icon } from './Icon';
import { DEFAULT_ICON_GRADE, DEFAULT_ICON_OPTICAL_SIZE, DEFAULT_ICON_SIZE, DEFAULT_ICON_WEIGHT } from './Icon.const';

export default {
  title: 'Icons/MaterialIcon',
  component: Icon,
  args: {
    name: 'home',
    isFilled: false,
    weight: DEFAULT_ICON_WEIGHT,
    grade: DEFAULT_ICON_GRADE,
    opticalSize: DEFAULT_ICON_OPTICAL_SIZE,
    size: DEFAULT_ICON_SIZE,
    unsafeColor: undefined,
  },
  argTypes: {
    unsafeColor: { control: 'color' },
  },
} as Meta<typeof Icon>;

const Template: StoryFn<typeof Icon> = ({ ...args }) => <Icon {...args} />;

export const Icons = Template.bind({});
Icons.args = {};
