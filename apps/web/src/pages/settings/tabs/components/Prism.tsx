import { colors, Tooltip } from '../../../../design-system';
import { Prism as MantinePrism } from '@mantine/prism';
import { ActionIcon } from '@mantine/core';
import { Check, Copy } from '../../../../design-system/icons';
import React from 'react';
import { useClipboard } from '@mantine/hooks';

export function Prism({ code }: { code: string }) {
  return (
    <MantinePrism
      trim={false}
      styles={(theme) => ({
        scrollArea: {
          border: ` 1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[5]}`,
          borderRadius: '7px',
        },
        code: {
          fontWeight: 400,
          color: `${colors.B60} !important`,
          backgroundColor: 'transparent !important',
        },
      })}
      language="javascript"
      data-test-id="embed-code-snippet"
    >
      {code}
    </MantinePrism>
  );
}

type Props = {
  code: string;
  index?: number;
  onCopy?: (index: number) => void;
};

export function PrismOnCopy({ index, code, onCopy }: Props) {
  const clipboardEnvironmentIdentifier = useClipboard({ timeout: 1000 });

  function handleOnClick(copyIndex: number | undefined, copyCode: string) {
    clipboardEnvironmentIdentifier.copy(copyCode);

    if (onCopy && copyIndex != null) {
      onCopy(copyIndex);
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <MantinePrism
        trim={false}
        styles={(theme) => ({
          scrollArea: {
            border: ` 1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[5]}`,
            borderRadius: '7px',
          },
          code: {
            fontWeight: 400,
            color: `${colors.B60} !important`,
            backgroundColor: 'transparent !important',
          },
        })}
        language="javascript"
        data-test-id="embed-code-snippet"
        noCopy={true}
      >
        {code}
      </MantinePrism>
      <div style={{ position: 'absolute', top: 0, right: 0, padding: '17px' }}>
        <Tooltip label={clipboardEnvironmentIdentifier.copied ? 'Copied!' : 'Copy'}>
          <ActionIcon variant="transparent" onClick={() => handleOnClick(index, code)}>
            {clipboardEnvironmentIdentifier.copied ? <Check /> : <Copy />}
          </ActionIcon>
        </Tooltip>
      </div>
    </div>
  );
}
