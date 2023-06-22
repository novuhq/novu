import styled from '@emotion/styled';
import { Button, Text, colors } from '../../../design-system';

const IntegrationsListToolbarHolder = styled.div`
  display: flex;
  justify-content: space-between;
`;

const ButtonHolder = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ReactangleButton = styled(Button)`
  width: 24px;
  max-width: 24px;
  height: 24px;
  padding: 0;
  font-size: 14px;

  &:disabled ~ label {
    cursor: default;
  }

  &:disabled ~ label > div {
    color: ${colors.B40};
    background-image: none !important;
    background-clip: initial !important;
    -webkit-text-fill-color: initial !important;
  }
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  height: 100%;
  color: ${colors.horizontal};
  user-select: none;
  cursor: pointer;
`;

export const IntegrationsListToolbar = ({ areIntegrationsLoading }: { areIntegrationsLoading: boolean }) => {
  return (
    <IntegrationsListToolbarHolder>
      <ButtonHolder>
        <ReactangleButton id="add-provider" disabled={areIntegrationsLoading}>
          +
        </ReactangleButton>
        <Label htmlFor="add-provider">
          <Text gradient>Add a provider</Text>
        </Label>
      </ButtonHolder>
    </IntegrationsListToolbarHolder>
  );
};
