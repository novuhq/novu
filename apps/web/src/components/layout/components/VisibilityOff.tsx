import { EyeInvisibleOutlined } from '@ant-design/icons';
import styled from '@emotion/styled';

import { colors } from '@novu/design-system';

import { useHoverOverItem } from '../../../hooks';

export const VisibilityOff = ({ handleClick }: { handleClick: () => void }) => {
  const { item: hover, onMouseEnter, onMouseLeave } = useHoverOverItem<boolean>({ enterDelay: 0 });

  return (
    <IconContainer
      onClick={handleClick}
      onMouseEnter={() => {
        onMouseEnter(true);
      }}
      onMouseLeave={onMouseLeave}
      hover={!!hover}
    >
      <EyeInvisibleOutlined
        style={{
          fontSize: '20px',
        }}
      />
    </IconContainer>
  );
};

const IconContainer = styled.div<{ hover: boolean }>`
  background: ${({ theme, hover }) => {
    if (!hover) {
      return 'transparent';
    }

    return theme.colorScheme === 'dark' ? colors.B30 : colors.BGLight;
  }};

  transition: background 0.2s ease;
  border-radius: 8px;
  height: 32px;
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
`;
