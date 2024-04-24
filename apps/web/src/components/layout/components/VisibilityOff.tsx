import { EyeInvisibleOutlined } from '@ant-design/icons';
import styled from '@emotion/styled';

import { colors } from '@novu/design-system';

/** @deprecated */
export const VisibilityOff = ({ onClick }: { onClick: React.MouseEventHandler<HTMLDivElement> }) => {
  return (
    <IconContainer onClick={onClick}>
      <EyeInvisibleOutlined
        style={{
          fontSize: '20px',
        }}
      />
    </IconContainer>
  );
};

const IconContainer = styled.div`
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B30 : colors.BGLight)};
  transition: background 0.2s ease;
  border-radius: 8px;
  height: 32px;
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
`;
