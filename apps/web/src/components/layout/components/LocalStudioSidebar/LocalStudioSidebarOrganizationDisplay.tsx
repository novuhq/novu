import { LocalizedMessage, Text } from '@novu/novui';
import { Flex, Stack } from '@novu/novui/jsx';
import { FC, ReactNode } from 'react';

type LocalStudioSidebarOrganizationDisplayProps = {
  icon: ReactNode;
  title: LocalizedMessage;
  subtitle: LocalizedMessage;
};

export const LocalStudioSidebarOrganizationDisplay: FC<LocalStudioSidebarOrganizationDisplayProps> = ({
  icon,
  title,
  subtitle,
}) => {
  return (
    <Flex gap="50" py="75" px="100">
      {icon}
      <Stack gap="25">
        <Text variant="strong">{title}</Text>
        <Text variant={'secondary'}>{subtitle}</Text>
      </Stack>
    </Flex>
  );
};
