import { SVGProps, useState } from 'react';
import { createStyles, Tooltip, UnstyledButton, UnstyledButtonProps } from '@mantine/core';
import { useTimeout } from '@mantine/hooks';
import { colors } from '@novu/design-system';
import styled from '@emotion/styled';

export const CopyIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
      <mask id="mask0_6503_2169" maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
        <rect width="16" height="16" fill="#3D3D4D" />
      </mask>
      <g mask="url(#mask0_6503_2169)">
        <path
          // eslint-disable-next-line max-len
          d="M5.99999 12C5.66999 12 5.38749 11.8825 5.15249 11.6475C4.91749 11.4125 4.79999 11.13 4.79999 10.8V2.79998C4.79999 2.46998 4.91749 2.18748 5.15249 1.95248C5.38749 1.71748 5.66999 1.59998 5.99999 1.59998H12.4C12.73 1.59998 13.0125 1.71748 13.2475 1.95248C13.4825 2.18748 13.6 2.46998 13.6 2.79998V10.8C13.6 11.13 13.4825 11.4125 13.2475 11.6475C13.0125 11.8825 12.73 12 12.4 12H5.99999ZM5.99999 10.8H12.4V2.79998H5.99999V10.8ZM3.59999 14.4C3.26999 14.4 2.98749 14.2825 2.75249 14.0475C2.51749 13.8125 2.39999 13.53 2.39999 13.2V3.99998H3.59999V13.2H11.2V14.4H3.59999Z"
          fill="white"
        />
      </g>
    </svg>
  );
};

export type CopyProps = UnstyledButtonProps & {
  onCopy: () => void;
};

const useCopyButtonStyles = createStyles({
  root: {
    svg: {
      width: '12px',
      height: '12px',
    },
  },
});

const unstyledButtonStyles = styled(UnstyledButton)`
  visibility: 'hidden',
    '&:hover': {
        visibility: 'visible',
      },
    `;

export const CopyIdentifierButton = ({ onCopy, className, ...props }: CopyProps) => {
  const [copied, setCopied] = useState(false);
  const { start: closeTooltip } = useTimeout(() => setCopied(false), 1000);
  const { classes } = useCopyButtonStyles();

  return (
    <Tooltip label="Copied" opened={copied} closeDelay={500}>
      <UnstyledButton
        data-copy
        className={`${className} ${classes.root}`}
        {...props}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();

          onCopy();
          setCopied(true);
          closeTooltip();
        }}
      >
        <CopyIcon />
      </UnstyledButton>
    </Tooltip>
  );
};
