import { Stack, Title, UnstyledButton, useMantineColorScheme } from '@mantine/core';
import { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { colors } from '../../../design-system';
import { Close } from '../../../design-system/icons/actions/Close';
import { useBasePath } from '../hooks/useBasePath';

export const SubPageWrapper = ({
  children,
  title,
  style,
  color = colors.B60,
}: {
  children: any;
  title: string | any;
  style?: CSSProperties | undefined;
  color?: string;
}) => {
  const navigate = useNavigate();
  const path = useBasePath();
  const { colorScheme } = useMantineColorScheme();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        padding: '24px',
        backgroundColor: colorScheme === 'dark' ? colors.B17 : colors.white,
        borderRadius: '0 7px 7px 0 ',
        width: 460,
        position: 'relative',
        ...style,
      }}
      data-test-id="step-page-wrapper"
    >
      <div style={{ display: 'flex' }}>
        <Stack
          style={{
            flex: '1 1 auto',
            height: 48,
          }}
        >
          <Title
            sx={{
              lineHeight: '48px',
              flex: '1 1 auto',
              display: 'flex',
              flexFlow: 'Column',
            }}
            color={color}
            size={20}
            weight="bold"
          >
            {title}
          </Title>
        </Stack>
        <UnstyledButton
          sx={{
            height: 48,
          }}
          onClick={() => {
            navigate(path);
          }}
          data-test-id="close-step-page"
        >
          <Close color={colors.B60} />
        </UnstyledButton>
      </div>
      {children}
    </div>
  );
};
