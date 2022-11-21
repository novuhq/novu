import { Skeleton } from '@mantine/core';
import { colors } from '../../../../design-system';

export const ItemSkeleton = () => (
  <div
    style={{
      marginLeft: '15px',
      marginRight: '15px',
      borderTop: `2px solid ${colors.B20}`,
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
            background: `${colors.B30} !important`,
          },
        },
      })}
      radius="xl"
    />
    <Skeleton height={7} mt={10} width="80%" animate={false} radius="xl" />
    <Skeleton height={7} mt={10} width="70%" animate={false} radius="xl" />
  </div>
);
