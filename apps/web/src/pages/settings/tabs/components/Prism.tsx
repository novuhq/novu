import { colors } from '../../../../design-system';
import { Prism as MantinePrism } from '@mantine/prism';

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
