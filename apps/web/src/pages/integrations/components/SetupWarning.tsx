import styled from '@emotion/styled';
import { Group } from '@mantine/core';

import { When } from '../../../components/utils/When';
import { DisconnectGradient } from '@novu/design-system';

const WarningMessage = styled(Group)`
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: nowrap;
  padding: 15px;
  color: #e54545;

  background: rgba(230, 69, 69, 0.15);
  border-radius: 7px;
  a {
    text-decoration: underline;
  }

  svg {
    min-width: 24px;
    width: 24px;
    height: 24px;
  }
`;

export const SetupWarning = ({
  show,
  message,
  docReference,
}: {
  show: boolean;
  message: string;
  docReference?: string;
}) => {
  return (
    <When truthy={show}>
      <WarningMessage spacing={12}>
        <DisconnectGradient />
        <div>
          {message}{' '}
          <a href={docReference} target="_blank" rel="noopener noreferrer">
            Explore set-up guide
          </a>
        </div>
      </WarningMessage>
    </When>
  );
};
