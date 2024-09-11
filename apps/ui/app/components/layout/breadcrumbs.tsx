import { Breadcrumbs, Group, Select, Box, Text } from '@mantine/core';
import { useMatches } from '@remix-run/react';
import { useState } from 'react';
import { IconKeyboardArrowRight } from '@novu/novui/icons';

const Separator = () => (
  <Box c="dimmed" mt="xs">
    <IconKeyboardArrowRight />
  </Box>
);

export function NavigationBreadcrumbs() {
  const matches = useMatches();
  const [environment, setEnvironment] = useState<'Development' | 'Production'>('Development');

  return (
    <>
      <Group gap="xs">
        <Breadcrumbs separator={<Separator />} separatorMargin="md">
          <Text>Organization</Text>
          <Select
            variant="unstyled"
            data={[
              {
                group: 'Environments',
                items: [
                  { value: 'Development', label: 'Development' },
                  { value: 'Production', label: 'Production' },
                ],
              },
            ]}
            value={environment}
            size="md"
            allowDeselect={false}
            rightSection={<></>}
            w="6.25rem"
            checkIconPosition="right"
            styles={{
              input: {
                paddingRight: 0,
              },
            }}
            comboboxProps={{ withArrow: false, width: '12rem', position: 'bottom-start', offset: 0 }}
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
