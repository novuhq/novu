import { IExtendedCellProps, withCellLoading } from '../../../design-system';
import type { ITableIntegration } from '../types';
import { IntegrationStatus } from './IntegrationStatus';

const IntegrationStatusCellBase = ({ row: { original } }: IExtendedCellProps<ITableIntegration>) => {
  return <IntegrationStatus active={original.active} />;
};

export const IntegrationStatusCell = withCellLoading(IntegrationStatusCellBase, {
  loadingTestId: 'integration-status-cell-loading',
});
