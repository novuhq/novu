import { MouseEventHandler, ReactNode } from 'react';
import { Popover as MantinePopover, PopoverProps as MantinePopoverProps, useMantineTheme } from '@mantine/core';

import { colors, shadows } from '../config';
import { Label } from '../typography/label';

type PopoverProps = {
  target: ReactNode;
  content?: ReactNode;
  title?: string;
  description?: string;
  url?: string;
  urlText?: string;
  onUrlClick?: MouseEventHandler<HTMLAnchorElement>;
  titleGradient: 'red' | 'blue' | 'none';
} & Omit<MantinePopoverProps, 'children'>;

export const Popover = ({
  target,
  content,
  title,
  titleGradient = 'none',
  description,
  url,
  urlText,
  onUrlClick,
  ...rest
}: PopoverProps) => {
  const { colorScheme } = useMantineTheme();

  return (
    <MantinePopover
      withArrow
      position="right"
      radius="md"
      shadow={colorScheme === 'dark' ? shadows.dark : shadows.medium}
      offset={30}
      {...rest}
    >
      <MantinePopover.Target>{target}</MantinePopover.Target>
      <MantinePopover.Dropdown
        onClick={(e) => e.stopPropagation()}
        style={{
          minHeight: '100px',
          padding: '16px',
          backgroundColor: colorScheme === 'dark' ? colors.B17 : colors.white,
        }}
      >
        {title && (
          <Label gradientColor={titleGradient} style={{ marginBottom: '8px' }}>
            {title}
          </Label>
        )}
        <div style={{ maxWidth: '220px' }}>
          {description && (
            <span style={{ color: colorScheme === 'dark' ? colors.white : colors.B60, lineHeight: 1.5 }}>
              {description}
            </span>
          )}
          {url && (
            <a
              href={url}
              style={{ color: '#DD2476', textDecoration: 'underline' }}
              onClick={onUrlClick}
              target="_blank"
              rel="noreferrer"
            >
              {urlText ?? 'Learn More'}
            </a>
          )}
        </div>
        {content}
      </MantinePopover.Dropdown>
    </MantinePopover>
  );
};
