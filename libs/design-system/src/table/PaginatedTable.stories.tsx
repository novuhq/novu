import { useState } from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Badge } from '@mantine/core';

import { Switch } from '../switch/Switch';
import { IExtendedColumn, Table } from './Table';

export default {
  title: 'Components/PaginatedTable',
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

const bigData: IExampleData[] = new Array(222).fill(1).map((_, index) => {
  const isOdd = index % 2 === 1;
  const creationDate = new Date().toISOString();

  return { name: `${index}`, category: isOdd ? 'Fun' : 'Meh', status: isOdd ? 'Disabled' : 'Enabled', creationDate };
});

const PaginatedTemplate: StoryFn<typeof Table> = ({ ...args }) => (
  <Table
    {...args}
    columns={columns as any}
    data={bigData}
    pagination={{ pageSize: 10, total: bigData.length, onPageChange: () => {}, current: 0 }}
  />
);

export const PaginatedTable = PaginatedTemplate.bind({});
PaginatedTemplate.args = {};
