import { useInputState } from '@mantine/hooks';
import { ActionIcon, Divider } from '@mantine/core';
import { Controller, useFormContext } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showNotification } from '@mantine/notifications';
import type { IResponseError, IFeedEntity } from '@novu/shared';

import { Checkbox, colors, Input, PlusGradient } from '@novu/design-system';
import { useEnvController } from '../../../../hooks';
import { createFeed, getFeeds } from '../../../../api/feeds';
import { QueryKeys } from '../../../../api/query.keys';
import { FeedItems } from './FeedItems';
import { EnableAvatarSwitch } from './EnableAvatarSwitch';
import type { IForm } from '../formTypes';
import { useStepFormPath } from '../../hooks/useStepFormPath';

export const AvatarFeedFields = () => {
  const queryClient = useQueryClient();
  const { readonly } = useEnvController();
  const [newFeed, setNewFeed] = useInputState('');
  const { control, setValue, getValues } = useFormContext<IForm>();
  const path = useStepFormPath();

  const { data: feeds } = useQuery([QueryKeys.getFeeds], getFeeds);
  const { mutateAsync: createNewFeed } = useMutation<IFeedEntity, IResponseError, { name: string }>(createFeed, {
    onSuccess: (data) => {
      queryClient.setQueryData([QueryKeys.getFeeds], [...feeds, data]);
    },
  });

  const [showFeed, setShowFeed] = useState(true);

  useEffect(() => {
    const feed = getValues(`${path}.template.feedId`);
    if (feeds?.length && !feed) {
      setTimeout(() => {
        setValue(`${path}.template.feedId`, '');
      }, 0);
      setShowFeed(false);
    }
  }, [getValues, setValue, path, feeds]);

  async function addNewFeed() {
    if (newFeed) {
      const exists = feeds.filter((feed) => feed.name === newFeed);
      if (exists.length) {
        showNotification({
          message: 'You already have a feed with this name! ',
          color: 'red',
        });

        return;
      }
      const response = await createNewFeed({
        name: newFeed,
      });

      setNewFeed('');

      setTimeout(() => {
        setValue(`${path}.template.feedId`, response._id, { shouldDirty: true });
      }, 0);
      setShowFeed(true);
    }
  }

  return (
    <>
      <EnableAvatarSwitch name={`${path}.template.enableAvatar`} control={control} readonly={readonly} />
      <Divider sx={{ borderTopColor: colors.B40 }} mb={20} />
      <Controller
        name={`${path}.template.feedId` as any}
        defaultValue=""
        control={control}
        render={({ field }) => {
          return (
            <>
              <div
                style={{
                  position: 'relative',
                }}
              >
                <Checkbox
                  data-test-id={`use-feeds-checkbox`}
                  checked={showFeed}
                  disabled={readonly}
                  onChange={() => {
                    setShowFeed(!showFeed);
                    if (showFeed) {
                      setValue(`${path}.template.feedId`, '', { shouldDirty: true });
                    }
                  }}
                  sx={{
                    position: 'absolute',
                    flexDirection: 'row-reverse',
                    right: '0px',
                  }}
                  styles={{
                    label: {
                      marginRight: '10px',
                    },
                  }}
                  label="Use Feeds"
                  labelPosition="left"
                />
                <Input
                  data-test-id={`create-feed-input`}
                  disabled={!showFeed || readonly}
                  label="Add New Feed (optional)"
                  placeholder="Name your feed..."
                  value={newFeed}
                  onChange={setNewFeed}
                  description={
                    // eslint-disable-next-line max-len
                    'Feeds can be used to display specific notifications in multiple tabs or sections when fetching in-app notifications'
                  }
                  rightSection={
                    <ActionIcon data-test-id={`add-feed-button`} variant="transparent" onClick={addNewFeed}>
                      <PlusGradient />
                    </ActionIcon>
                  }
                />
              </div>
              <FeedItems field={field} showFeed={showFeed} setValue={setValue} />
            </>
          );
        }}
      />
    </>
  );
};
