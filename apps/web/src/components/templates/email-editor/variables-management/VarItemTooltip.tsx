import { Check, Copy } from '../../../../design-system/icons';
import { ActionIcon, Tooltip, useMantineTheme } from '@mantine/core';
import { VarItem } from './VarItem';
import { useClipboard } from '@mantine/hooks';

export const VarItemTooltip = ({ pathToCopy, name, type }: { pathToCopy: string; name: string; type: string }) => {
  const theme = useMantineTheme();
  const { copy, copied } = useClipboard({ timeout: 1000 });

  return (
    <Tooltip data-test-id={'Tooltip'} label={copied ? <Check /> : <Copy />}>
      <ActionIcon
        variant="transparent"
        onClick={() => {
          copy(pathToCopy);
        }}
        sx={{ width: '100%', height: 'unset', minWidth: 'unset', minHeight: 'unset', lineHeight: '1.15' }}
      >
        <VarItem name={name} type={type} />
      </ActionIcon>
    </Tooltip>
  );
};
