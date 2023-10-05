import { ChannelTypeEnum } from '@novu/shared';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row } from 'react-table';
import { ROUTES } from '../../constants/routes.enum';

import { IntegrationsList } from './IntegrationsList';
import { ITableIntegration } from './types';

export const IntegrationsListPage = () => {
  const navigate = useNavigate();

  const onRowClickCallback = useCallback(
    (item: Row<ITableIntegration>) => {
      navigate(`/integrations/${item.original.integrationId}`);
    },
    [navigate]
  );

  const onAddProviderClickCallback = useCallback(() => {
    navigate(ROUTES.INTEGRATIONS_CREATE);
  }, [navigate]);

  const onChannelClickCallback = useCallback(
    (channel: ChannelTypeEnum) => {
      navigate(`${ROUTES.INTEGRATIONS_CREATE}?scrollTo=${channel}`);
    },
    [navigate]
  );

  return (
    <IntegrationsList
      onAddProviderClick={onAddProviderClickCallback}
      onRowClickCallback={onRowClickCallback}
      onChannelClick={onChannelClickCallback}
    />
  );
};
