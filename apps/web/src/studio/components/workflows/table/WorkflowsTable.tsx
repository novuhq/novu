/* cspell:disable */

import { createColumnHelper, Table } from '@novu/novui';
import { css } from '@novu/novui/css';
import { FC } from 'react';
import { ROUTES } from '../../../../constants/routes';
import { WorkflowTableRow } from './WorkflowsTable.types';
import { NameCell } from './WorkflowsTableCellRenderers';
import { useStudioNavigate } from '../../../hooks/useStudioNavigate';

interface IWorkflowsTableProps {
  isLoading: boolean;
  workflows: any[];
}

const columnHelper = createColumnHelper<WorkflowTableRow>();

const WORKFLOW_COLUMNS = [
  columnHelper.accessor('workflowId', {
    header: 'Trigger ID',
    cell: NameCell,
  }),
];

// TODO: this should accept props to control behavior
export const WorkflowsTable: FC<IWorkflowsTableProps> = ({ workflows, isLoading }) => {
  const navigate = useStudioNavigate();
  const LOADING_ROWS = 5;

  return (
    <div className={css({ display: 'flex', flex: '1' })}>
      <Table<WorkflowTableRow>
        isLoading={isLoading}
        loadingItems={LOADING_ROWS}
        columns={WORKFLOW_COLUMNS}
        data={workflows || []}
        className={css({ w: '[100%]' })}
        onRowClick={(row) =>
          navigate(ROUTES.STUDIO_FLOWS_VIEW, {
            templateId: row.original.workflowId,
          })
        }
      />
    </div>
  );
};
