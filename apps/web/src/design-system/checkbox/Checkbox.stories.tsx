import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Group } from '@mantine/core';
import { Checkbox } from './Checkbox';

export default {
  title: 'Components/Checkbox',
  component: Checkbox,
  argTypes: {},
} as Meta<typeof Checkbox>;

const Template: StoryFn<typeof Checkbox> = ({ ...args }) => <Checkbox {...args} />;

export const Default = Template.bind({});
Default.args = {
  label: 'Checkbox Label',
};

export const States = () => (
  <Group style={{ display: 'flex', flexDirection: 'column', alignItems: 'unset' }}>
    <Checkbox label="Checked checkbox" checked />
  </Group>
);

export const Disabled = () => (
  <Group style={{ display: 'flex', flexDirection: 'column', alignItems: 'unset' }}>
    <Checkbox label="Checked checkbox" checked disabled />
    <Checkbox label="Checked checkbox" disabled />
  </Group>
);
