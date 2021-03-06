import { ComponentStory, ComponentMeta } from '@storybook/react';

import { Tabs } from './Tabs';

export default {
  title: 'Menus/TabsMenu',

  component: Tabs,

  argTypes: {},
} as ComponentMeta<typeof Tabs>;

const Template: ComponentStory<typeof Tabs> = ({ ...args }) => <Tabs {...args} />;

export const Default = Template.bind({});
Default.args = {
  menuTabs: [
    {
      label: 'Branding',
      content: 'Branding',
    },

    {
      label: 'In App Center',
      content: 'In App Center',
    },

    {
      label: 'Email Settings',
      content: 'Email Settings',
    },

    {
      label: 'SMS',
      content: 'SMS',
    },

    {
      label: 'Api Keys',
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
      label: 'Branding',
      content: 'Branding',
      icon: '46',
    },

    {
      label: 'In App Center',
      content: 'In App Center',
      icon: '45',
    },

    {
      label: 'Email Settings',
      content: 'Email Settings',
      icon: '44',
    },

    {
      label: 'SMS',
      content: 'SMS',
      icon: '43',
    },

    {
      label: 'Api Keys',
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
