import { css } from '@novu/novui/css';
import { Button } from '@mantine/core';

export function CardButton({
  id,
  children,
  active = false,
  onClick,
}: {
  id?: string;
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      onClick={onClick}
      data-active={active}
      variant={active ? 'light' : 'subtle'}
      classNames={{
        root: css({
          padding: '2px 0px !important',
          display: 'flex !important',
          width: '100px !important',
          minWidth: '100px !important',
          height: 'auto !important',
          borderRadius: '12px !important',
          justifyContent: 'center !important',
          '& .mantine-Button-label svg': {
            fill: 'typography.text.secondary !important',
            ...(id !== 'cli' && {
              '& path': {
                fill: 'typography.text.secondary !important',
              },
            }),
          },
          '&[data-active="true"]': {
            backgroundColor: {
              base: '#616161 !important',
              _dark: '#292933 !important',
            },
          },
          '&[data-active="true"] .mantine-Button-label svg': {
            fill: '#fff !important',
            // cli is exclude because it's messes up it's svg
            ...(id !== 'cli' && {
              '& path': {
                fill: '#fff !important',
              },
            }),
          },
          '&[data-active="true"] .mantine-Button-label': {
            color: '#fff !important',
          },
          '&:not([data-active="true"]):hover': {
            backgroundColor: {
              base: '#dbdbdb !important',
              _dark: '#292933 !important',
            },
          },
        }),
        label: css({
          padding: '16px !important',
          display: 'flex !important',
          flexDirection: 'column !important',
          fontSize: '14px !important',
          fontWeight: '400 !important',
          color: 'typography.text.secondary !important',
          '& svg': {
            width: '32px !important',
            height: '32px !important',
            marginBottom: '8px !important',
            color: 'typography.text.secondary !important',
          },
        }),
      }}
    >
      {children}
    </Button>
  );
}

export function CardButtonGroupWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className={css({ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' })}>{children}</div>
  );
}
