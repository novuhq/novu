/* cspell:disable */

import { createColumnHelper, Table } from '@novu/novui';
import { css } from '@novu/novui/css';
import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../../constants/routes';
import { WorkflowTableRow } from './WorkflowsTable.types';
import { NameCell } from './WorkflowsTableCellRenderers';
import { parseUrl } from '../../../../utils/routeUtils';

interface IWorkflowsTableProps {
  temp?: string;
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
export const WorkflowsTable: FC<IWorkflowsTableProps> = ({ workflows }) => {
  const navigate = useNavigate();

  return (
    <div className={css({ display: 'flex', flex: '1' })}>
      <Table<WorkflowTableRow>
        columns={WORKFLOW_COLUMNS}
        data={workflows || []}
        className={css({ w: '[100%]' })}
        onRowClick={(row) =>
          navigate(
            parseUrl(ROUTES.STUDIO_FLOWS_VIEW, {
              templateId: row.original.workflowId,
            })
          )
        }
      />
    </div>
  );
};
