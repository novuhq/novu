import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Group } from '@mantine/core';
import { Slider } from './Slider';

export default {
  title: 'Components/RangeSlider',
  component: Slider,
  argTypes: {},
} as ComponentMeta<typeof Slider>;

const Template: ComponentStory<typeof Slider> = ({ ...args }) => <Slider {...args} />;

export const Default = Template.bind({});
Default.args = {
  thumbSize: 12,
};

export const States = () => (
  <Group style={{ display: 'flex', flexDirection: 'column', alignItems: 'unset' }}>
    <Slider />
  </Group>
);

export const Disabled = () => <Slider disabled />;
