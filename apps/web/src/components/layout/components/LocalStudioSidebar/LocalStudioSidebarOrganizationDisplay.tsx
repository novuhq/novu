import { LocalizedMessage, Text } from '@novu/novui';
import { Flex, Stack } from '@novu/novui/jsx';
import { FC } from 'react';
import { COMPANY_LOGO_PATH } from '../../../../constants/assets';
import { css } from '@novu/novui/css';

type LocalStudioSidebarOrganizationDisplayProps = {
  title: LocalizedMessage;
  subtitle: LocalizedMessage;
};

export const LocalStudioSidebarOrganizationDisplay: FC<LocalStudioSidebarOrganizationDisplayProps> = ({
  title,
  subtitle,
}) => {
  return (
    <Flex gap="50" py="75" px="100">
      {/** TODO:  use grey logo */}
      <img
        // TODO: use actual organization photo
        src={COMPANY_LOGO_PATH}
        className={css({
          w: '125',
          h: '125',
          borderRadius: '100',
        })}
      />
      <Stack gap="25">
        <Text variant="strong">{title}</Text>
        <Text variant={'secondary'}>{subtitle}</Text>
      </Stack>
    </Flex>
  );
};
