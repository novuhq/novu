import { Group, Stack } from '@mantine/core';
import { Button, colors, Text, Title } from '@novu/design-system';
import { TranslationFileIcon, TranslationFolderIcon, TranslationVariablesIcon, AddGroupIcon } from '../../icons';

export function TranslationGroupEmptyList({
  handleAddGroupButtonClick,
  readonly,
}: {
  handleAddGroupButtonClick: () => void;
  readonly: boolean;
}) {
  return (
    <Stack
      sx={{
        height: '80%',
        width: '100%',
      }}
      align="center"
      justify="center"
      spacing={40}
    >
      <Title color={colors.B40}>Set up message translations</Title>
      <Group spacing={40}>
        <Stack align="center" justify="center">
          <TranslationFolderIcon />
          <Group spacing={6} align="flex-start">
            <Text weight="bold" color={colors.B40}>
              1.
            </Text>
            <Text weight="bold" color={colors.B40}>
              Add a translation group <br />
              and specify languages
            </Text>
          </Group>
        </Stack>
        <Stack align="center" justify="center">
          <div style={{ position: 'relative', height: '58px', width: '88px' }}>
            <TranslationFileIcon style={{ position: 'absolute', top: 0 }} />
            <TranslationFileIcon
              style={{
                position: 'absolute',
                top: 0,
                left: '20px',
              }}
            />
            <TranslationFileIcon
              style={{
                position: 'absolute',
                top: 0,
                left: '40px',
              }}
            />
          </div>
          <Group spacing={6} align="flex-start">
            <Text weight="bold" color={colors.B40}>
              2.
            </Text>
            <Text weight="bold" color={colors.B40}>
              Upload JSON files with
              <br /> the multiple languages
            </Text>
          </Group>
        </Stack>
        <Stack align="center" justify="center">
          <TranslationVariablesIcon />
          <Group spacing={6} align="flex-start">
            <Text weight="bold" color={colors.B40}>
              3.
            </Text>
            <Text weight="bold" color={colors.B40}>
              Use translations variables
              <br />
              in the content editor
            </Text>
          </Group>
        </Stack>
      </Group>
      <Button
        onClick={handleAddGroupButtonClick}
        data-test-id="add-group-btn"
        disabled={readonly}
        icon={<AddGroupIcon />}
      >
        Add group
      </Button>
    </Stack>
  );
}
