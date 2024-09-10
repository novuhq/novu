import { Breadcrumbs, Text, Group, Select, Box } from '@mantine/core';
import { useMatches } from '@remix-run/react';
import { useState } from 'react';
import { IconKeyboardArrowRight } from '@novu/novui/icons';

const Separator = () => (
  <Box c="dimmed">
    <IconKeyboardArrowRight />
  </Box>
);

export function NavigationBreadcrumbs() {
  const matches = useMatches();
  const [environment, setEnvironment] = useState<'Development' | 'Production'>('Development');

  return (
    <>
      <Group gap="xs">
        <Separator />
        <Breadcrumbs separator={<Separator />}>
          <Select
            variant="unstyled"
            data={['Development', 'Production']}
            value={environment}
            allowDeselect={false}
            leftSection={<Separator />}
            rightSection={<></>}
            checkIconPosition="right"
            comboboxProps={{ withArrow: false }}
            onChange={(value) => {
              setEnvironment(value as 'Development' | 'Production');
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
