import { useState } from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Badge } from '@mantine/core';

import { Switch } from '../switch/Switch';
import { IExtendedColumn, Table } from './Table';

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

interface IExampleData {
  name: string;
  category: string;
  creationDate: string;
  status: string;
}

const columns: IExtendedColumn<IExampleData>[] = [
  { accessor: 'name', Header: 'Name' },
  { accessor: 'category', Header: 'Category', Cell: BadgeCell },
  { accessor: 'creationDate', Header: 'Date Created' },
  { accessor: 'status', Header: 'Status', Cell: SwitchCell },
];

const data: IExampleData[] = [
  { name: 'Great', category: 'Fun', status: 'Disabled', creationDate: '01/01/2021 16:36' },
  { name: 'Whats up?', category: 'Done', status: 'Enabled', creationDate: '01/01/2021 16:36' },
];

const Template: StoryFn<typeof Table> = ({ ...args }) => <Table columns={columns as any} data={data} {...args} />;

export const PrimaryUse = Template.bind({});
PrimaryUse.args = {};
