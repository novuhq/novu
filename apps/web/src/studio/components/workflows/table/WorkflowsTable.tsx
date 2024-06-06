/* cspell:disable */

import { createColumnHelper, Table } from '@novu/novui';
import { css } from '@novu/novui/css';
import format from 'date-fns/format';
import { FC } from 'react';
import { WorkflowTableRow } from './WorkflowsTable.types';
import { GroupCell, NameCell, StatusCell } from './WorkflowsTableCellRenderers';

// TODO: remove this test data
const TEST_FLOW = {
  _id: 'adaewr',
  name: 'test naming',
  active: false,
  type: 'REGULAR',
  draft: true,
  critical: false,
  isBlueprint: false,
  _notificationGroupId: 'dsasdfasdf',
  tags: [],
  triggers: [
    {
      type: 'event',
      identifier: 'test-naming',
      variables: [],
      reservedVariables: [],
      subscriberVariables: [],
      _id: 'sdfsdf',
    },
  ],
  steps: [],
  preferenceSettings: {
    email: true,
    sms: true,
    in_app: true,
    chat: true,
    push: true,
  },
  _environmentId: 'sdfsdf',
  _organizationId: 'sdf',
  _creatorId: 'sdfsdfsdf',
  deleted: false,
  createdAt: '2024-06-04T19:11:11.600Z',
  updatedAt: '2024-06-05T17:55:39.022Z',
  __v: 0,
  notificationGroup: {
    _id: 'sdfsdf',
    name: 'General',
    _organizationId: 'sdfsdf',
    _environmentId: 'sdfdfsdfsf',
    createdAt: '2024-05-17T22:26:08.177Z',
    updatedAt: '2024-05-17T22:26:08.177Z',
    __v: 0,
  },
  workflowIntegrationStatus: {
    hasActiveIntegrations: true,
    channels: {
      in_app: {
        hasActiveIntegrations: false,
      },
      email: {
        hasActiveIntegrations: true,
        hasPrimaryIntegrations: true,
      },
      sms: {
        hasActiveIntegrations: true,
        hasPrimaryIntegrations: true,
      },
      chat: {
        hasActiveIntegrations: false,
      },
      push: {
        hasActiveIntegrations: false,
      },
    },
  },
};

interface IWorkflowsTableProps {
  temp?: string;
}

const columnHelper = createColumnHelper<WorkflowTableRow>();

const WORKFLOW_COLUMNS = [
  columnHelper.accessor('name', {
    header: 'Name & Trigger ID',
    cell: NameCell,
  }),
  columnHelper.accessor('notificationGroup.name', {
    header: 'Group',
    cell: GroupCell,
  }),
  columnHelper.accessor('createdAt', {
    header: 'Created at',
    cell: ({ getValue }) => format(new Date(getValue() ?? ''), 'dd/MM/yyyy HH:mm'),
  }),
  columnHelper.accessor('active', {
    header: 'Status',
    cell: StatusCell,
  }),
];

export const WorkflowsTable: FC<IWorkflowsTableProps> = () => {
  return (
    <div className={css({ display: 'flex', flex: '1' })}>
      <Table<typeof TEST_FLOW>
        columns={WORKFLOW_COLUMNS}
        data={[TEST_FLOW, { ...TEST_FLOW, active: true }]}
        className={css({ w: '100%' })}
      />
    </div>
  );
};
