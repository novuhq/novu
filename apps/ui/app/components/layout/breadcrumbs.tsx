import { Breadcrumbs, Anchor, Text, Group } from '@mantine/core';
import { useMatches } from '@remix-run/react';

const Separator = () => <Text c="dimmed">/</Text>;

export function NavigationBreadcrumbs() {
  const matches = useMatches();
  console.log({ matches });

  return (
    <>
      <Group gap="xs">
        <Separator />
        <Breadcrumbs separator={<Separator />}>
          <Anchor href="/">Development</Anchor>
          {matches
            .filter((match) => match.handle && match.handle.breadcrumb)
            .map((match, index) => (
              <Anchor key={index}>{match.handle.breadcrumb(match)}</Anchor>
            ))}
        </Breadcrumbs>
      </Group>
    </>
  );
}
