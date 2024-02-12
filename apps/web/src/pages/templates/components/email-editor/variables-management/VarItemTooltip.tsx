import { useState } from 'react';
import { ActionIcon, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';

import { Check, Copy } from '@novu/design-system';
import { VarItem } from './VarItem';

export const VarItemTooltip = ({
  pathToCopy,
  name,
  type,
  highlight,
}: {
  pathToCopy: string;
  name: string;
  type: string;
  highlight?: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { copy, copied } = useClipboard({ timeout: 1000 });

  return (
    <Tooltip data-test-id={`var-item-${name}-${type}`} label={copied ? 'Copied!' : 'Copy key'}>
      <ActionIcon
        variant="transparent"
        onMouseOver={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => copy(pathToCopy)}
        sx={{ width: '100%', height: 'unset', minWidth: 'unset', minHeight: 'unset', lineHeight: '1.15' }}
      >
        <VarItem name={name} type={type} highlight={highlight}>
          <span style={{ position: 'absolute', right: '2%', bottom: copied ? '40%' : '20%' }}>
            {isHovered && !copied && <Copy />}
            {copied && <Check />}
          </span>
        </VarItem>
      </ActionIcon>
    </Tooltip>
  );
};
