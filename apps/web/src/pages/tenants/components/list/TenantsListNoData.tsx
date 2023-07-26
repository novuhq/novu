import styled from '@emotion/styled';

import { Buildings } from '../../../../design-system/icons';
import { colors } from '../../../../design-system';

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
  return (
    <NoDataHolder data-test-id="no-integrations-placeholder">
      <Buildings style={{ fill: colors.B30, width: '50px', height: '45px', margin: '30px' }} />
      <NoDataText>Add the first tenant for the</NoDataText>
      <NoDataText>development environment</NoDataText>
    </NoDataHolder>
  );
};
