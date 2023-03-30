import { Grid, Group, Stack, Title, UnstyledButton, useMantineColorScheme } from '@mantine/core';
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
        padding: '24px',
        backgroundColor: colorScheme === 'dark' ? colors.B17 : colors.white,
        borderRadius: '0 7px 7px 0 ',
        height: '100%',
        width: 460,
        position: 'relative',
        ...style,
      }}
    >
      <Stack mb={24}>
        <Grid gutter={0}>
          <Grid.Col span={11}>
            <Title
              sx={{
                width: '90%',
              }}
              color={color}
              size={20}
              weight="bold"
            >
              {title}
            </Title>
          </Grid.Col>
          <Grid.Col span={1}>
            <Stack
              justify="center"
              sx={{
                height: '100%',
              }}
            >
              <UnstyledButton
                onClick={() => {
                  navigate(path);
                }}
              >
                <Close color={colors.B60} />
              </UnstyledButton>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
      {children}
    </div>
  );
};
