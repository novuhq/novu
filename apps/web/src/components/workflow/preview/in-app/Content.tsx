import { Group, Stack } from '@mantine/core';
import { colors, Text } from '@novu/design-system';
import { MessageActionStatusEnum } from '@novu/shared';

import { useHover } from '../../../../hooks';
import { ActionBlockContainer } from '../../../../pages/templates/components/in-app-editor/preview/ActionBlockContainer';
import AvatarContainer from '../../../../pages/templates/components/in-app-editor/preview/AvatarContainer';
import { ParsedPreviewStateType } from '../../../../pages/templates/hooks/usePreviewInAppTemplate';
import { PreviewEditOverlay } from '../common';
import {
  ContentAndOverlayWrapperStyled,
  ContentStyled,
  NotificationTextStyled,
  SkeletonStyled,
  TimeTextStyled,
} from './Content.styles';

export default function Content({
  isPreviewLoading,
  parsedPreviewState,
  templateError,
  showOverlay = true,
  enableAvatar,
}: {
  isPreviewLoading: boolean;
  parsedPreviewState: ParsedPreviewStateType;
  templateError: string;
  showOverlay?: boolean;
  enableAvatar?: boolean;
}) {
  const { isHovered, onMouseEnter, onMouseLeave } = useHover();

  const isBlur = isHovered && showOverlay;

  return (
    <Stack spacing={16}>
      <div>
        <ContentAndOverlayWrapperStyled
          isError={!!templateError}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          {isBlur && <PreviewEditOverlay />}
          <ContentStyled isBlur={isBlur}>
            {isPreviewLoading ? (
              <Skeletons />
            ) : (
              <div>
                <Group spacing={10} align="flex-start">
                  {enableAvatar && <AvatarContainer opened={false} setOpened={() => {}} readonly={true} />}
                  <Stack spacing={24}>
                    <NotificationTextStyled
                      isExampleNotification={false}
                      dangerouslySetInnerHTML={{
                        __html: parsedPreviewState.content as string,
                      }}
                      data-test-id="in-app-content-preview"
                    />
                    <TimeTextStyled isExampleNotification={false}>5 minutes ago</TimeTextStyled>
                  </Stack>
                </Group>
                {parsedPreviewState.ctaButtons.length > 0 && (
                  <ActionBlockContainer
                    value={{
                      status: MessageActionStatusEnum.PENDING,
                      buttons: parsedPreviewState.ctaButtons,
                      result: {},
                    }}
                    onChange={() => {}}
                    onButtonAddClickHandle={() => {}}
                    onRemoveTemplate={() => {}}
                    isButtonsTemplateSelected={true}
                    readonly={true}
                  />
                )}
              </div>
            )}
          </ContentStyled>
        </ContentAndOverlayWrapperStyled>
        {templateError && !isPreviewLoading && <Text color={colors.error}>{templateError}</Text>}
      </div>

      <ContentStyled isBlur={false} isExampleNotification>
        <NotificationTextStyled isExampleNotification>Notification Example</NotificationTextStyled>
        <TimeTextStyled isExampleNotification>10 minutes ago</TimeTextStyled>
      </ContentStyled>
    </Stack>
  );
}

const Skeletons = () => {
  return (
    <Stack spacing={16} w="100%">
      <Stack spacing={5}>
        <SkeletonStyled height={14} width="35%" radius={4} />
        <SkeletonStyled height={14} width="70%" radius={4} />
      </Stack>
      <SkeletonStyled height={14} width="25%" radius={4} />
    </Stack>
  );
};
