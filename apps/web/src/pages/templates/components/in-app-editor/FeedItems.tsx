import { useState } from 'react';
import { Popover, useMantineTheme, Grid, ColorScheme, createStyles } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import styled from '@emotion/styled';
import * as Sentry from '@sentry/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showNotification } from '@mantine/notifications';
import type { UseFormSetValue } from 'react-hook-form';
import type { IResponseError, IFeedEntity } from '@novu/shared';

import { FeedChip } from './FeedChip';
import { colors, shadows, Text, Tooltip, Button, Copy, Trash } from '@novu/design-system';
import { deleteFeed, getFeeds } from '../../../../api/feeds';
import { QueryKeys } from '../../../../api/query.keys';
import type { IForm } from '../formTypes';

interface IFeedItemPopoverProps {
  showFeed: boolean;
  setValue: UseFormSetValue<IForm>;
  field: any;
}

export function FeedItems(props: IFeedItemPopoverProps) {
  const { data: feeds } = useQuery<IFeedEntity[]>([QueryKeys.getFeeds], getFeeds);

  return (
    <FeedsBlock>
      <Grid gutter={'xs'} grow>
        {(feeds || []).map((item, feedIndex) => {
          return (
            <Grid.Col span={4} key={item._id} sx={{ position: 'relative' }}>
              <FeedPopover
                field={props.field}
                item={item}
                feedIndex={feedIndex}
                showFeed={props.showFeed}
                setValue={props.setValue}
              />
            </Grid.Col>
          );
        })}
      </Grid>
    </FeedsBlock>
  );
}

const usePopoverStyles = createStyles(({ colorScheme }) => ({
  dropdown: {
    width: '170px',
    height: '95px',
    margin: 0,
    padding: 0,
    backgroundColor: colorScheme === 'dark' ? colors.B20 : colors.white,
    color: colorScheme === 'dark' ? colors.white : colors.B40,
    border: 'none',
    marginTop: '1px',
  },
  arrow: {
    backgroundColor: colorScheme === 'dark' ? colors.B20 : colors.white,
    height: '-22px',
    border: 'none',
    margin: '0px',
    top: '-3px',
  },
}));

function FeedPopover(props: IFeedPopoverProps) {
  const [opened, setOpened] = useState(false);
  const { classes } = usePopoverStyles();

  return (
    <Popover opened={opened} onClose={() => setOpened(false)} position="bottom" withArrow classNames={classes}>
      <Popover.Target>
        <span>
          <FeedChip
            item={props.item}
            feedIndex={props.feedIndex}
            setOpened={setOpened}
            showFeed={props.showFeed}
            field={props.field}
            setValue={props.setValue}
            onEditClick={() => {
              setOpened((prevCheck) => !prevCheck);
            }}
          />
        </span>
      </Popover.Target>
      <Popover.Dropdown>
        <PopoverActionBlock setOpened={setOpened} showFeed={props.showFeed} feedItem={props.item} />
      </Popover.Dropdown>
    </Popover>
  );
}

function PopoverActionBlock({
  setOpened,
  showFeed,
  feedItem,
}: {
  setOpened: (boolean) => void;
  showFeed: boolean;
  feedItem?: IFeedEntity;
}) {
  const { colorScheme } = useMantineTheme();

  return (
    <ActionBlockWrapper colorScheme={colorScheme} onMouseLeave={() => setOpened(false)}>
      <CopyBlock showFeed={showFeed} feedItem={feedItem} />
      <DeleteBlock setOpened={setOpened} showFeed={showFeed} feedItem={feedItem} />
    </ActionBlockWrapper>
  );
}

function CopyBlock({ showFeed, feedItem }: { showFeed: boolean; feedItem?: IFeedEntity }) {
  const [opened, setOpened] = useState(false);

  const { colorScheme } = useMantineTheme();
  const clipboardIdentifier = useClipboard({ timeout: 1000 });

  function handleOnclick() {
    clipboardIdentifier.copy(feedItem?.identifier);
    setOpened(true);
    setTimeout(() => {
      setOpened(false);
    }, 1000);
  }

  return (
    <Row colorScheme={colorScheme} disabled={!showFeed} onClick={handleOnclick}>
      <Tooltip label={'Copied!'} opened={opened}>
        <Copy
          style={{
            color: colorScheme === 'dark' ? colors.white : colors.B80,
            width: '25px',
            height: '25px',
            marginRight: '13px',
          }}
        />
      </Tooltip>
      <Text>Copy ID</Text>
    </Row>
  );
}

function DeleteBlock({
  setOpened,
  showFeed,
  feedItem,
}: {
  setOpened: (boolean) => void;
  showFeed: boolean;
  feedItem?: IFeedEntity;
}) {
  const { colorScheme } = useMantineTheme();
  const queryClient = useQueryClient();

  const { mutateAsync: deleteFeedById } = useMutation<IFeedEntity[], IResponseError, string>(
    (feedId) => deleteFeed(feedId),
    {
      onSuccess: (data) => {
        queryClient.refetchQueries([QueryKeys.getFeeds]);
      },
    }
  );

  async function deleteFeedHandler(feedId: string) {
    try {
      await deleteFeedById(feedId);
      setOpened(false);
      showNotification({
        message: 'Feed deleted successfully',
        color: 'green',
      });
    } catch (e: any) {
      Sentry.captureException(e);

      showNotification({
        message: e.message || 'Un-expected error occurred',
        color: 'red',
      });
    }
  }

  return (
    <Row colorScheme={colorScheme} disabled={!showFeed} onClick={() => deleteFeedHandler(feedItem?._id || '')}>
      <Trash
        style={{
          color: colorScheme === 'dark' ? colors.white : colors.B80,
          margin: '5px 13px 5px 5px',
        }}
      />
      <Text>Delete Feed</Text>
    </Row>
  );
}

const ActionBlockWrapper = styled.div<{ colorScheme: ColorScheme }>`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-around;

  border-radius: 7px;
  box-shadow: ${({ colorScheme }) => (colorScheme === 'dark' ? shadows.dark : shadows.medium)};
`;

const Row = styled(Button)<{ colorScheme: ColorScheme }>`
  display: flex;
  justify-content: start;
  align-items: center;
  z-index: 2;
  margin-right: 5px;
  margin-left: 5px;

  background: ${({ colorScheme }) => (colorScheme === 'dark' ? colors.B20 : colors.white)};

  box-shadow: none;
  :hover {
    background: ${({ colorScheme }) => (colorScheme === 'dark' ? colors.B30 : colors.B98)};
  }
`;

const FeedsBlock = styled.div`
  margin-bottom: 20px;
`;

interface IFeedPopoverProps {
  setValue: UseFormSetValue<IForm>;
  showFeed: boolean;
  feedIndex: number;
  item: IFeedEntity;
  field: any;
}
