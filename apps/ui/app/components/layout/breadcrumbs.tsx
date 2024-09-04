import { Breadcrumbs, Anchor, Text, Group } from '@mantine/core';
import { useMatches } from '@remix-run/react';

const Separator = () => <Text c="dimmed">/</Text>;

export function NavigationBreadcrumbs() {
  const matches = useMatches();

  return (
    <>
      <Group gap="xs">
        <Separator />
        <Breadcrumbs separator={<Separator />}>
          <Anchor href="/">Development</Anchor>
          {matches
            // @ts-expect-error - need to figure out how to type this
            .filter((match) => match.handle && match.handle.breadcrumb)
            .map((match, index) => (
              // @ts-expect-error - need to figure out how to type this
              <Anchor key={index}>{match.handle.breadcrumb(match)}</Anchor>
            ))}
        </Breadcrumbs>
      </Group>
    </>
  );
}
