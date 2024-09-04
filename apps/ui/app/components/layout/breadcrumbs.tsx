import { Breadcrumbs, Text, Group, Select } from '@mantine/core';
import { useMatches } from '@remix-run/react';

const Separator = () => <Text c="dimmed">/</Text>;

export function NavigationBreadcrumbs() {
  const matches = useMatches();

  return (
    <>
      <Group gap="xs">
        <Separator />
        <Breadcrumbs separator={<Separator />}>
          <Select
            variant="unstyled"
            data={['Development', 'Production']}
            value={'Development'}
            onChange={() => {
              // TODO: implement environment switching logic
            }}
          />
          {matches
            // @ts-expect-error - need to figure out how to type this
            .filter((match) => match.handle && match.handle.breadcrumb)
            .map((match, index) =>
              // @ts-expect-error - need to figure out how to type this
              match.handle.breadcrumb(match)
            )}
        </Breadcrumbs>
      </Group>
    </>
  );
}
