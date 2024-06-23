import styled from '@emotion/styled';
import { Divider, Flex, useMantineColorScheme } from '@mantine/core';
import { colors, Text } from '@novu/design-system';
import { LocaleSelect } from '../common';
import { ChatContent } from './ChatContent';
import { ChatInput } from './ChatInput';

const ChatPreviewContainer = styled.div`
  width: 100%;
  max-width: 37.5em;
`;

export const ChatBasePreview = ({
  content,
  loading = false,
  error,
  showEditOverlay = false,
  onLocaleChange,
  selectedLocale,
  locales,
}: {
  content: string;
  loading?: boolean;
  error?: string;
  showEditOverlay?: boolean;
  onLocaleChange: (locale: string) => void;
  selectedLocale?: string;
  locales: any[];
}) => {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <ChatPreviewContainer>
      <Flex>
        <LocaleSelect
          value={selectedLocale}
          onLocaleChange={onLocaleChange}
          isLoading={loading}
          locales={locales || []}
        />
      </Flex>
      <Divider
        color={isDark ? colors.B30 : colors.BGLight}
        label={
          <Text color={isDark ? colors.B30 : colors.BGLight} weight="bold">
            Today
          </Text>
        }
        labelPosition="center"
      />
      <ChatContent showOverlay={showEditOverlay} isLoading={loading} content={content} errorMsg={error} />
      <ChatInput />
    </ChatPreviewContainer>
  );
};
