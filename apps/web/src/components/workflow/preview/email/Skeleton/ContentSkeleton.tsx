import { Group, Skeleton, Stack } from '@mantine/core';

export function ContentSkeleton() {
  return (
    <Stack spacing={40} py={40} px={30} h="100%">
      <Group position="center" noWrap>
        <Skeleton height={40} width={80} radius="sm" />
      </Group>
      <Stack spacing={12}>
        <Group spacing={16} noWrap>
          <Skeleton height={14} width={'70%'} radius="sm" />
          <Skeleton height={14} width={'30%'} radius="sm" />
        </Group>
        <Group spacing={16} noWrap>
          <Skeleton height={14} width={'30%'} radius="sm" />
          <Skeleton height={14} width={'70%'} radius="sm" />
        </Group>
        <Group spacing={16} noWrap>
          <Skeleton height={14} width={'72%'} radius="sm" />
        </Group>
      </Stack>

      <Group spacing={16} mt="auto" noWrap>
        <Skeleton height={14} width={'30%'} radius="sm" />
      </Group>
    </Stack>
  );
}
