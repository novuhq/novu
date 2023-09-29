import { ComponentStory, ComponentMeta } from '@storybook/react';
import { SegmentedControl } from './SegmentedControl';

export default {
  title: 'Components/SegmentedControl',
  component: SegmentedControl,
  argTypes: {
    onChange: {
      table: {
        disable: true,
      },
    },
    loading: {
      table: {
        disable: true,
      },
    },
  },
} as ComponentMeta<typeof SegmentedControl>;

const Template: ComponentStory<typeof SegmentedControl> = ({ ...args }) => <SegmentedControl {...args} />;

export const Default = Template.bind({});
Default.args = {
  data: [
    { value: 'Development', label: 'Development' },
    { value: 'Production', label: 'Production' },
  ],
};
