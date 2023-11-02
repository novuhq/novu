import { IExtendedCellProps, withCellLoading } from '@novu/design-system';
import type { ITableIntegration } from '../types';
import { IntegrationChannel } from './IntegrationChannel';

const IntegrationChannelBase = ({ row: { original } }: IExtendedCellProps<ITableIntegration>) => {
  return <IntegrationChannel name={original.channel} testId="integration-channel-cell" type={original.channelType} />;
};

export const IntegrationChannelCell = withCellLoading(IntegrationChannelBase, {
  loadingTestId: 'integration-channel-cell-loading',
});
