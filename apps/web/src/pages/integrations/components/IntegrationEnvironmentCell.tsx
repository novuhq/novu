import { IExtendedCellProps, withCellLoading } from '@novu/design-system';
import type { ITableIntegration } from '../types';
import { IntegrationEnvironmentPill } from './IntegrationEnvironmentPill';

const IntegrationEnvironment = ({ row: { original } }: IExtendedCellProps<ITableIntegration>) => {
  if (!original.environment) {
    return null;
  }

  return <IntegrationEnvironmentPill name={original.environment} testId="integration-environment-cell" />;
};

export const IntegrationEnvironmentCell = withCellLoading(IntegrationEnvironment, {
  loadingTestId: 'integration-environment-cell-loading',
});
