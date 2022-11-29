import React, { useState } from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Badge } from '@mantine/core';
import { Switch } from '../switch/Switch';
import { Table } from './Table';

export default {
  title: 'Components/Table',
  component: Table,
  argTypes: {
    data: {
      control: false,
    },
    columns: {
      control: false,
    },
  },
} as ComponentMeta<typeof Table>;

const switchCell = (props) => {
  const [status, setStatus] = useState(props.status);
  const switchHandler = () => {
    setStatus((prev) => (prev === 'Enabled' ? 'Disabled' : 'Enabled'));
  };

  return <Switch label={status} onChange={switchHandler} checked={status === 'Enabled'} />;
};

const badgeCell = (props) => {
  return (
    <Badge
      sx={(theme) => ({
        color: theme.colorScheme === 'dark' ? theme.white : theme.colors.gray[8],
        borderColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[5],
        borderRadius: '5px',
        backgroundColor: 'transparent',
        height: '30px',
        padding: '10px',
        fontSize: '14px',
        fontWeight: 400,
      })}
      variant="outline"
      size="md"
      radius="xs"
    >
      {props.category}
    </Badge>
  );
};

const columns = [
  { accessor: 'name', Header: 'Name' },
  { accessor: 'category', Header: 'Category', Cell: badgeCell },
  { accessor: 'creationDate', Header: 'Date Created' },
  { accessor: 'status', Header: 'Status', Cell: switchCell },
];
const data = [
  { name: 'Great', category: 'Fun', status: 'Disabled', creationDate: '01/01/2021 16:36' },
  { name: 'Whats up?', category: 'Done', status: 'Enabled', creationDate: '01/01/2021 16:36' },
];

const Template: ComponentStory<typeof Table> = ({ ...args }) => <Table columns={columns} data={data} {...args} />;

export const PrimaryUse = Template.bind({});
PrimaryUse.args = {};
