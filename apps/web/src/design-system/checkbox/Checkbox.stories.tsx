import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Group } from '@mantine/core';
import { Checkbox } from './Checkbox';

export default {
  title: 'Components/Checkbox',
  component: Checkbox,
  argTypes: {},
} as ComponentMeta<typeof Checkbox>;

const Template: ComponentStory<typeof Checkbox> = ({ ...args }) => <Checkbox {...args} />;

export const Default = Template.bind({});
Default.args = {
  label: 'Checkbox Label',
};

export const States = () => (
  <Group style={{ display: 'flex', flexDirection: 'column', alignItems: 'unset' }}>
    <Checkbox label="Checked checkbox" checked />
    <Checkbox label="Disabled checkbox" disabled />
    <Checkbox label="Disabled checked checkbox" checked disabled />
  </Group>
);
