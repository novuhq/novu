import { StoryFn, Meta } from '@storybook/react';

import { Tabs } from './Tabs';

export default {
  title: 'Menus/TabsMenu',

  component: Tabs,

  argTypes: {},
} as Meta<typeof Tabs>;

const Template: StoryFn<typeof Tabs> = ({ ...args }) => <Tabs {...args} />;

export const Default = Template.bind({});
Default.args = {
  menuTabs: [
    {
      value: 'Branding',
      content: 'Branding',
    },

    {
      value: 'In App Center',
      content: 'In App Center',
    },

    {
      value: 'Email Settings',
      content: 'Email Settings',
    },

    {
      value: 'SMS',
      content: 'SMS',
    },

    {
      value: 'Api Keys',
      content: 'Api Keys',
    },
  ],
};

export const VerticalTabMenu = Template.bind({});
VerticalTabMenu.args = {
  ...Default.args,

  orientation: 'vertical',
};

export const HorizontalTabMenuWithIcon = Template.bind({});
HorizontalTabMenuWithIcon.args = {
  menuTabs: [
    {
      value: 'Branding',
      content: 'Branding',
      icon: '46',
    },

    {
      value: 'In App Center',
      content: 'In App Center',
      icon: '45',
    },

    {
      value: 'Email Settings',
      content: 'Email Settings',
      icon: '44',
    },

    {
      value: 'SMS',
      content: 'SMS',
      icon: '43',
    },

    {
      value: 'Api Keys',
      content: 'Api Keys',
      icon: '42',
    },
  ],

  withIcon: true,
};

export const VerticalTabMenuWithIcon = Template.bind({});
VerticalTabMenuWithIcon.args = {
  ...HorizontalTabMenuWithIcon.args,

  withIcon: true,

  orientation: 'vertical',
};
