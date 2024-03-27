import styled from '@emotion/styled';
import React from 'react';

import { Button, Text } from '@novu/design-system';

const Holder = styled.div`
  display: flex;
  justify-content: space-between;
`;

const ButtonStyled = styled(Button)`
  margin-left: -8px;
`;

const PlusSquare = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  max-width: 24px;
  height: 24px;
  padding: 0;
  font-size: 18px;
  font-weight: 700;
  border-radius: 4px;
`;

export const Toolbar = ({
  tenantLoading,
  onAddTenantClick,
}: {
  tenantLoading: boolean;
  onAddTenantClick: React.MouseEventHandler<HTMLButtonElement>;
}) => {
  return (
    <Holder>
      <ButtonStyled
        id="add-tenant"
        onClick={onAddTenantClick}
        disabled={tenantLoading}
        data-test-id="add-tenant"
        variant="subtle"
      >
        <PlusSquare data-square>+</PlusSquare>
        <Text gradient>Add a tenant</Text>
      </ButtonStyled>
    </Holder>
  );
};
