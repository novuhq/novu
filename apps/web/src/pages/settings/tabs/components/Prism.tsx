import { colors } from '@novu/design-system';
import { Prism as MantinePrism } from '@mantine/prism';
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
  language?: string;
};

export function PrismOnCopy({ index, code, onCopy, language }: Props) {
  const clipboardEnvironmentIdentifier = useClipboard({ timeout: 1000 });

  function handleOnClick(copyIndex: number | undefined, copyCode: string) {
    clipboardEnvironmentIdentifier.copy(copyCode);

    if (onCopy && copyIndex != null) {
      onCopy(copyIndex);
    }
  }

  return (
    <div
      onClick={() => {
        handleOnClick(index, code);
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
        language={(language as any) || 'javascript'}
        data-test-id="embed-code-snippet"
      >
        {code}
      </MantinePrism>
    </div>
  );
}
