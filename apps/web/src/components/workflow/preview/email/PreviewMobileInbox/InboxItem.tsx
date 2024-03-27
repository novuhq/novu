import { Skeleton, useMantineTheme } from '@mantine/core';
import { colors } from '@novu/design-system';

export const ItemSkeleton = () => {
  const theme = useMantineTheme();

  return (
    <div
      style={{
        marginLeft: '15px',
        marginRight: '15px',
        borderTop: `2px solid ${theme.colorScheme === 'dark' ? colors.B20 : colors.B85}`,
        paddingTop: '23px',
        marginTop: '25px',
      }}
    >
      <Skeleton
        height={10}
        width="25%"
        animate={false}
        styles={() => ({
          root: {
            '&:after': {
              background: `${theme.colorScheme === 'dark' ? colors.B30 : colors.B85} !important`,
            },
          },
        })}
        radius="xl"
      />
      <Skeleton height={7} mt={10} width="80%" animate={false} radius="xl" />
      <Skeleton height={7} mt={10} width="70%" animate={false} radius="xl" />
    </div>
  );
};
