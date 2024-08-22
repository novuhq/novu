import { Avatar } from '@mantine/core';
import { Text, Title } from '@novu/novui';
import { css, cva } from '@novu/novui/css';
import { IconArrowDropDown, IconMoreHoriz, IconPerson, IconSettings } from '@novu/novui/icons';
import { Center, Flex, HStack, Stack } from '@novu/novui/jsx';

import { ParsedPreviewStateType } from '../../../../../pages/templates/hooks/usePreviewInAppTemplate';
import { SkeletonStyled } from '../Content.styles';

export function Content({
  isPreviewLoading,
  parsedPreviewState,
}: {
  isPreviewLoading: boolean;
  parsedPreviewState: ParsedPreviewStateType;
}) {
  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        alignSelf: 'stretch',
        borderRadius: '150',
        bgColor: 'surface.popover',
        padding: '1.25rem 1.5rem',
        h: '32.5rem',
      })}
    >
      {/* Header -  Inbox dropdown and settings icon section */}
      <div
        className={css({
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          alignSelf: 'stretch',
          paddingBottom: '1.25rem',
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
      </div>

      {/* Feed tabs section */}
      <HStack
        gap={28}
        className={css({
          borderColor: 'tabs.border',
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
        <Flex paddingBlock="1rem" gap="0.5rem" alignSelf="stretch" flexGrow={1}>
          <Avatar radius={8}>
            <IconPerson />
          </Avatar>
          <Skeletons />
        </Flex>
      ) : (
        <Flex paddingBlock="1rem" gap="0.5rem" alignSelf="stretch" flexGrow={1}>
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
          {parsedPreviewState.avatar ? (
            <Avatar src={parsedPreviewState.avatar} radius={8}>
              <IconPerson />
            </Avatar>
          ) : null}
          {/* Message Section */}
          <Stack gap="1rem" flexGrow={1}>
            <Stack gap="0.25rem">
              <HStack justifyContent="space-between">
                <Text variant="main" fontWeight="strong">
                  {parsedPreviewState.subject}
                </Text>

                <Text variant="main" color="typography.text.secondary">
                  5 min
                </Text>
              </HStack>
              <Text variant="main" color="typography.text.secondary">
                {parsedPreviewState.content}
              </Text>
            </Stack>

            {/* Actions Section */}
            {parsedPreviewState.ctaButtons && parsedPreviewState.ctaButtons.length > 0 ? (
              <Flex gap="1rem">
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
    </div>
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
        bgColor: '#369EFF',
      },
      secondary: {
        bgColor: '#2E2E32',
      },
    },
  },
});
