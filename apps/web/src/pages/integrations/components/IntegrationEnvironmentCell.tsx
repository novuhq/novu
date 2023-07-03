import { IExtendedCellProps, withCellLoading } from '../../../design-system';
import type { ITableIntegration } from '../types';
import { IntegrationEnvironmentPill } from './IntegrationEnvironmentPill';

const IntegrationEnvironment = ({ row: { original } }: IExtendedCellProps<ITableIntegration>) => {
  return <IntegrationEnvironmentPill name={original.environment} testId="integration-environment-cell" />;
};

export const IntegrationEnvironmentCell = withCellLoading(IntegrationEnvironment, {
  loadingTestId: 'integration-environment-cell-loading',
});
