import { SVGProps, useState } from 'react';
import { createStyles, Tooltip, UnstyledButton, UnstyledButtonProps } from '@mantine/core';
import { useTimeout } from '@mantine/hooks';

export const CopyIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        // eslint-disable-next-line max-len
        d="M2.80001 8.80004H2.20001C1.88174 8.80004 1.57652 8.67361 1.35147 8.44856C1.12643 8.22352 1 7.91829 1 7.60003V2.20001C1 1.88174 1.12643 1.57652 1.35147 1.35147C1.57652 1.12643 1.88174 1 2.20001 1H7.60003C7.91829 1 8.22352 1.12643 8.44856 1.35147C8.67361 1.57652 8.80004 1.88174 8.80004 2.20001V2.80001M6.39979 5.19996H11.7998C12.4626 5.19996 12.9998 5.73722 12.9998 6.39997V11.8C12.9998 12.4627 12.4626 13 11.7998 13H6.39979C5.73705 13 5.19979 12.4627 5.19979 11.8V6.39997C5.19979 5.73722 5.73705 5.19996 6.39979 5.19996Z"
        stroke="#828299"
      />
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

export const CopyButton = ({ onCopy, className, ...props }: CopyProps) => {
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
