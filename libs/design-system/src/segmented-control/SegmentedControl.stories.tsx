import { StoryFn, Meta } from '@storybook/react';
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
} as Meta<typeof SegmentedControl>;

const Template: StoryFn<typeof SegmentedControl> = ({ ...args }) => <SegmentedControl {...args} />;

export const Default = Template.bind({});
Default.args = {
  data: [
    { value: 'Development', label: 'Development' },
    { value: 'Production', label: 'Production' },
  ],
};
