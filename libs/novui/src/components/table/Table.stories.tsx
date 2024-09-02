import React, { useState } from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Badge, Switch } from '@mantine/core';

import { ColumnDef } from '@tanstack/react-table';
import { Table } from './Table';
import { Button } from '../Button';
import { IconOutlineAdd } from '../../icons';

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
} as Meta<typeof Table>;

const SwitchCell = (props) => {
  const [status, setStatus] = useState(props.status);
  const switchHandler = () => {
    setStatus((prev) => (prev === 'Enabled' ? 'Disabled' : 'Enabled'));
  };

  return <Switch label={status} onChange={switchHandler} checked={status === 'Enabled'} />;
};

const BadgeCell = (props) => {
  return (
    <Badge variant="outline" size="md" radius="xs">
      {props.getValue()}
    </Badge>
  );
};

interface IExampleData {
  name: string;
  category: string;
  creationDate: string;
  status: string;
}

const columns: ColumnDef<IExampleData>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'category', header: 'Category', cell: BadgeCell },
  { accessorKey: 'creationDate', header: 'Date Created' },
  { accessorKey: 'status', header: 'Status', cell: SwitchCell },
];

const data: IExampleData[] = [
  { name: 'Great', category: 'Fun', status: 'Disabled', creationDate: '01/01/2021 16:36' },
  { name: 'Whats up?', category: 'Done', status: 'Enabled', creationDate: '01/01/2021 16:36' },
];

const Template: StoryFn<typeof Table> = ({ ...args }) => (
  <>
    <Button Icon={IconOutlineAdd} variant="transparent" py="50">
      Add row
    </Button>
    <Table columns={columns} data={data} {...args} />
  </>
);

export const PrimaryUse = Template.bind({});
PrimaryUse.args = {};
