import styled from '@emotion/styled';
import { Skeleton, Stack } from '@mantine/core';
import { colors, Text } from '@novu/design-system';

import { useHover } from '../../../../hooks';
import { PreviewEditOverlay } from '../common';
import {
  ContentAndOVerlayWrapperStyled,
  ContentStyled,
  NotificationTextstyled,
  SkeletonStyled,
  TimeTextStyled,
} from './Content.styles';

export default function Content({ isPreviewLoading, parsedPreviewState, templateError }) {
  const { isHovered, onMouseEnter, onMouseLeave } = useHover();

  return (
    <Stack spacing={16}>
      <div>
        <ContentAndOVerlayWrapperStyled
          isError={!!templateError}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          {isHovered && <PreviewEditOverlay />}
          <ContentStyled isBlur={isHovered}>
            {isPreviewLoading ? (
              <Skeletons />
            ) : (
              <>
                <NotificationTextstyled
                  isExampleNotification={false}
                  dangerouslySetInnerHTML={{
                    __html: parsedPreviewState.content as string,
                  }}
                />
                <TimeTextStyled isExampleNotification={false}>5 minutes ago</TimeTextStyled>
              </>
            )}
          </ContentStyled>
        </ContentAndOVerlayWrapperStyled>
        {templateError && !isPreviewLoading && <Text color={colors.error}>{templateError}</Text>}
      </div>

      <ContentStyled isBlur={false} isExampleNotification>
        <NotificationTextstyled isExampleNotification>Notification Example</NotificationTextstyled>
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
