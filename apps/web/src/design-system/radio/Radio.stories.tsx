import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Radio, RadioProps } from './Radio';

export default {
  title: 'Components/Radio',
  component: Radio,
  argTypes: {},
} as ComponentMeta<typeof Radio>;

const Template: ComponentStory<typeof Radio> = ({ children, ...args }: RadioProps) => <Radio {...args}>Button</Radio>;

export const Default = Template.bind({});
Default.args = {
  value: 'test',
};

export const Disabled = ({ ...args }) => {
  return (
    <>
      <div style={{ marginBottom: 10 }}>
        <Radio disabled value="test" {...args}>
          Button
        </Radio>
      </div>

      <div>
        <Radio disabled checked value="test" {...args}>
          Button
        </Radio>
      </div>
    </>
  );
};
