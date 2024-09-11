import { Breadcrumbs, Group, Select, Box, Text, Avatar } from '@mantine/core';
import { useMatches } from '@remix-run/react';
import { useState } from 'react';
import { IconKeyboardArrowRight } from '@novu/novui/icons';
import { EnvironmentIcon } from '../icons/environment-icon';

const Separator = () => (
  <Box c="dimmed" mt="xs">
    <IconKeyboardArrowRight />
  </Box>
);

enum EnvironmentEnum {
  DEVELOPMENT = 'Development',
  PRODUCTION = 'Production',
}

export function NavigationBreadcrumbs() {
  const matches = useMatches();
  const [environment, setEnvironment] = useState<EnvironmentEnum>(EnvironmentEnum.DEVELOPMENT);

  return (
    <>
      <Group gap="xs">
        <Breadcrumbs separator={<Separator />} separatorMargin="md">
          {/* TODO: implement Organization switcher */}
          <Group gap="sm">
            <Avatar bg="error" size="sm" radius="sm" name="Organization" />
            <Text>Organization</Text>
          </Group>
          <Select
            variant="unstyled"
            data={[
              {
                group: 'Environments',
                items: [
                  { value: EnvironmentEnum.DEVELOPMENT, label: 'Development' },
                  { value: EnvironmentEnum.PRODUCTION, label: 'Production' },
                ],
              },
            ]}
            leftSection={<EnvironmentIcon environment={environment} />}
            value={environment}
            size="md"
            allowDeselect={false}
            rightSection={<></>}
            w="8.75rem"
            checkIconPosition="right"
            styles={{
              input: {
                paddingRight: 0,
              },
            }}
            comboboxProps={{ withArrow: false, width: '12rem', position: 'bottom-start', offset: 0 }}
            onChange={(value) => {
              setEnvironment(value as EnvironmentEnum);
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
