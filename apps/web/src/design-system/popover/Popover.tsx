import { MouseEventHandler, ReactNode } from 'react';
import styled from '@emotion/styled';
import { Popover as MantinePopover, PopoverProps as MantinePopoverProps, useMantineTheme } from '@mantine/core';

import { colors, shadows } from '../config';
import { Label } from '../typography/label';

const DescriptionHolder = styled.div`
  max-width: 220px;
`;

type PopoverProps = {
  target: ReactNode;
  content?: ReactNode;
  title?: string;
  description?: string;
  url?: string;
  urlText?: string;
  onUrlClick?: MouseEventHandler<HTMLAnchorElement>;
  titleGradient?: 'red' | 'blue' | 'none';
  className?: string;
  opacity?: string | number;
  onDropdownMouseEnter?: MouseEventHandler<HTMLDivElement>;
  onDropdownMouseLeave?: MouseEventHandler<HTMLDivElement>;
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
  className,
  opacity,
  onDropdownMouseEnter,
  onDropdownMouseLeave,
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
      middlewares={{ flip: false, shift: false }}
      {...rest}
    >
      <MantinePopover.Target>{target}</MantinePopover.Target>
      <MantinePopover.Dropdown
        className={className}
        onMouseEnter={onDropdownMouseEnter}
        onMouseLeave={onDropdownMouseLeave}
        onClick={(e) => e.stopPropagation()}
        style={{
          minHeight: '100px',
          padding: '16px',
          backgroundColor: colorScheme === 'dark' ? colors.B17 : colors.white,
        }}
        sx={{ opacity: `${opacity} !important` ?? 1 }}
      >
        {title && (
          <Label gradientColor={titleGradient} style={{ marginBottom: '8px' }}>
            {title}
          </Label>
        )}
        <DescriptionHolder className="popover-description-holder">
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
        </DescriptionHolder>
        {content}
      </MantinePopover.Dropdown>
    </MantinePopover>
  );
};
