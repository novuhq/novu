import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { NavMenu } from './NavMenu';
import { Activity, Bolt, Settings, Team } from '../icons';

export default {
  title: 'Menus/NavigationMenu',
  component: NavMenu,
  argTypes: {},
} as ComponentMeta<typeof NavMenu>;

const iconSettings = { width: '20px', height: '20px' };
const menuItems = [
  { icon: <Bolt {...iconSettings} />, label: 'Notifications' },
  { icon: <Activity {...iconSettings} />, label: 'Activity Feed' },
  { icon: <Team {...iconSettings} />, label: 'Team Members' },
  { icon: <Settings {...iconSettings} />, label: 'Settings' },
];

const Template: ComponentStory<typeof NavMenu> = ({ ...args }) => <NavMenu {...args} menuItems={menuItems} />;

export const Default = Template.bind({});
Default.args = {};
