import { Text, Title } from '@novu/novui';
import { css, cva } from '@novu/novui/css';
import { IconArrowDropDown, IconMoreHoriz, IconSettings } from '@novu/novui/icons';
import { Center, Flex, HStack, Stack } from '@novu/novui/jsx';
import { parseMarkdownIntoTokens } from '@novu/js/internal';
import { ParsedPreviewStateType } from '../../../../../pages/templates/hooks/usePreviewInAppTemplate';
import { SkeletonStyled } from '../Content.styles';
import { InboxAvatar } from './InboxAvatar';

export const INBOX_TOKENS = {
  'semantic/color/neutral/60': '#828299',
  'semantic/color/neutral/80': '#3D3D4D',
  'semantic/color/neutral/90': '#292933',
  'semantic/margins/buttons/S/S': '1rem',
  'Inbox/whiteLable/buttons/accent/normal': '#369EFF',
  'Inbox/whiteLable/secondaryButton': '#2E2E32',
  'Inbox/whiteLable/devider': '#2E2E32',
  'Inbox/paddings/header/vertical': '1.25rem',
  'Inbox/paddings/header/horizontal': '1.5rem',
  'Inbox/paddings/message/horizontal': '1.5rem',
  'Inbox/paddings/message/vertical': '1rem',
  'Inbox/margin/message/avatar/txt': '0.5rem',
  'Inbox/margin/message/txt/buttons': '1rem',
} as const;

const renderText = (text?: string) => {
  if (!text) {
    return null;
  }

  const tokens = parseMarkdownIntoTokens(text);

  return tokens.map((token, index) => {
    if (token.type === 'bold') {
      return (
        <Text
          variant="main"
          fontWeight="strong"
          color="typography.text.primary"
          children={token.content}
          as="strong"
          key={index}
        />
      );
    }

    return token.content;
  });
};

export function InboxPreviewContent({
  isPreviewLoading,
  parsedPreviewState,
}: {
  isPreviewLoading: boolean;
  parsedPreviewState: ParsedPreviewStateType;
}) {
  return (
    <Flex
      className={css({
        flexDirection: 'column',
        alignItems: 'flex-start',
        alignSelf: 'stretch',
        borderRadius: '150',
        bgColor: 'surface.popover',
        py: INBOX_TOKENS['Inbox/paddings/header/vertical'],
        px: INBOX_TOKENS['Inbox/paddings/header/horizontal'],
        h: '32.5rem',
      })}
    >
      {/* Header -  Inbox dropdown and settings icon section */}
      <Flex
        className={css({
          justifyContent: 'space-between',
          alignItems: 'center',
          alignSelf: 'stretch',
          paddingBottom: INBOX_TOKENS['Inbox/paddings/header/vertical'],
        })}
      >
        <HStack gap={8}>
          <Title variant="section">Inbox</Title>
          <IconArrowDropDown />
        </HStack>
        <HStack gap={8}>
          <IconMoreHoriz />
          <IconSettings />
        </HStack>
      </Flex>

      {/* Feed tabs section */}
      <HStack
        gap={28}
        className={css({
          borderColor: INBOX_TOKENS['Inbox/whiteLable/devider'],
          borderBottom: 'solid',
          borderBottomWidth: '1',
          alignSelf: 'stretch',
          height: '2rem',
        })}
        alignItems="flex-start"
      >
        <Flex
          gap={8}
          className={css({
            position: 'relative',
            alignSelf: 'stretch',
            _before: {
              bgGradient: 'to-r',
              gradientFrom: 'colorPalette.start',
              gradientTo: 'colorPalette.end',
              content: '""',
              position: 'absolute',
              bottom: 0,
              w: '100%',
              h: '0.125rem',
              zIndex: 1,
            },
          })}
        >
          <Text variant="main" fontWeight="strong">
            Feed
          </Text>
          <div>
            <span
              className={css({
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '0 0.375rem',
                borderRadius: 'circle',
                bgGradient: 'to-r',
                gradientFrom: 'colorPalette.start',
                gradientTo: 'colorPalette.end',
              })}
            >
              1
            </span>
          </div>
        </Flex>
        <Text variant="main" fontWeight="strong" color="typography.text.secondary">
          Feed
        </Text>
        <Text variant="main" fontWeight="strong" color="typography.text.secondary">
          Feed
        </Text>
        <Text variant="main" fontWeight="strong" color="typography.text.secondary">
          Feed
        </Text>
      </HStack>

      {/* Content Section */}

      {isPreviewLoading ? (
        <Flex
          paddingBlock={INBOX_TOKENS['Inbox/paddings/message/vertical']}
          gap={INBOX_TOKENS['Inbox/margin/message/avatar/txt']}
          alignSelf="stretch"
          flexGrow={1}
        >
          <InboxAvatar />
          <Skeletons />
        </Flex>
      ) : (
        <Flex
          paddingBlock={INBOX_TOKENS['Inbox/paddings/message/vertical']}
          gap={INBOX_TOKENS['Inbox/margin/message/avatar/txt']}
          alignSelf="stretch"
          flexGrow={1}
        >
          {/* Unread Dot */}
          <span
            className={css({
              w: '0.5rem',
              h: '0.5rem',
              bgColor: '#369EFF',
              borderRadius: 'circle',
              mt: '0.125rem',
            })}
          />

          {/* Avatar Section */}
          {parsedPreviewState.avatar ? <InboxAvatar src={parsedPreviewState.avatar} /> : null}
          {/* Message Section */}
          <Stack gap={INBOX_TOKENS['Inbox/margin/message/txt/buttons']} flexGrow={1}>
            <Stack gap="0.25rem">
              <HStack justifyContent="space-between">
                <Text variant="main">{renderText(parsedPreviewState.subject)}</Text>

                <Text variant="main" color="typography.text.secondary">
                  5 min
                </Text>
              </HStack>
              <Text variant="main">{renderText(parsedPreviewState.content)}</Text>
            </Stack>

            {/* Actions Section */}
            {parsedPreviewState.ctaButtons && parsedPreviewState.ctaButtons.length > 0 ? (
              <Flex gap={INBOX_TOKENS['semantic/margins/buttons/S/S']}>
                {parsedPreviewState.ctaButtons.map((button, index) => (
                  <button key={index} className={actionButtonRecipe({ type: button.type })}>
                    {button.content}
                  </button>
                ))}
              </Flex>
            ) : null}
          </Stack>
        </Flex>
      )}

      {/* Footer */}
      <Center gap="0.25rem" alignSelf="stretch" mt="auto">
        <img
          src={`/static/images/novu-gray.svg`}
          className={css({
            h: '0.75rem',
            w: '0.75rem',
            borderRadius: 'circle',
          })}
        />
        <Text variant="secondary">Powered by Novu</Text>
      </Center>
    </Flex>
  );
}

const Skeletons = () => {
  return (
    <Stack gap="0.75rem" w="100%">
      <Stack gap={5}>
        <SkeletonStyled height={14} width="35%" radius={4} />
        <SkeletonStyled height={14} width="70%" radius={4} />
      </Stack>
      <SkeletonStyled height={14} width="25%" radius={4} />
    </Stack>
  );
};

const actionButtonRecipe = cva({
  base: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0 0.75rem',
    borderRadius: 'm',
    color: 'white',
    cursor: 'pointer',
    height: '2rem',
  },
  variants: {
    type: {
      primary: {
        bgColor: INBOX_TOKENS['Inbox/whiteLable/buttons/accent/normal'],
      },
      secondary: {
        bgColor: INBOX_TOKENS['Inbox/whiteLable/secondaryButton'],
      },
    },
  },
});
