import { Skeleton, Stack } from '@mantine/core';

export function HeaderSkeleton() {
  return (
    <>
      <Skeleton height={40} width={40} circle />
      <Stack spacing={3}>
        <Skeleton height={14} width={160} radius="xs" />
        <Skeleton height={14} width={80} />
      </Stack>
    </>
  );
}
