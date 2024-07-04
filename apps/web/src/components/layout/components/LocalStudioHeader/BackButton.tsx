import { Text } from '@novu/novui';
import { IconOutlineArrowBack } from '@novu/novui/icons';
import { hstack } from '@novu/novui/patterns';

type BackButtonProps = { onClick: () => void };

export function BackButton({ onClick }: BackButtonProps) {
  return (
    <button
      className={hstack({
        cursor: 'pointer',
        gap: 'margins.icons.Icon20-txt',
        px: '75',
        py: '25',
        borderRadius: '75',
        textStyle: 'text.secondary !important',
        _hover: { bg: 'badge.border', '& p, & svg': { color: 'typography.text.main !important' } },
      })}
      onClick={onClick}
    >
      <IconOutlineArrowBack />
      <Text variant="secondary" fontWeight={'strong'}>
        Back
      </Text>
    </button>
  );
}
