import styled from '@emotion/styled';

import { Buildings, colors } from '@novu/design-system';
import { useEnvController } from '../../../../hooks';
import { When } from '../../../../components/utils/When';

const NoDataHolder = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  height: 500px;
`;

const NoDataText = styled.h2`
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: ${colors.B40};
  margin: 0;
`;

export const TenantsListNoData = () => {
  const { environment, isLoading } = useEnvController();
  const environmentName = environment?.name?.toLowerCase();

  return (
    <When truthy={!isLoading}>
      <NoDataHolder data-test-id="no-tenant-placeholder">
        <Buildings style={{ color: colors.B30, width: '50px', height: '45px', margin: '30px' }} />
        <NoDataText>Add the first tenant for the</NoDataText>
        <NoDataText>{environmentName} environment</NoDataText>
      </NoDataHolder>
    </When>
  );
};
