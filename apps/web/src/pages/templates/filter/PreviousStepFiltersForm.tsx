import { Grid } from '@mantine/core';
import { ChannelTypeEnum, PreviousStepTypeEnum } from '@novu/shared';
import { Controller, useFieldArray } from 'react-hook-form';
import { Select } from '../../../design-system';
import { Trash } from '../../../design-system/icons';
import { channels } from '../../../utils/channels';
import { DeleteStepButton } from './FilterModal.styles';

export const PreviousStepFiltersForm = ({
  control,
  stepIndex,
  index,
  remove,
  readonly,
}: {
  control;
  stepIndex: number;
  index: number;
  remove: (index?: number | number[]) => void;
  readonly: boolean;
}) => {
  const { fields } = useFieldArray({
    control,
    name: 'steps',
  });

  return (
    <>
      <Grid.Col span={3}>
        <Controller
          control={control}
          name={`steps.${stepIndex}.filters.0.children.${index}.step`}
          defaultValue=""
          render={({ field }) => {
            return (
              <Select
                placeholder="Select previous step"
                data={
                  fields
                    .map((item: any, itemIndex: number, list: any[]) => {
                      if (![ChannelTypeEnum.EMAIL, ChannelTypeEnum.IN_APP].includes(item.template.type)) {
                        return undefined;
                      }

                      if (itemIndex >= stepIndex) {
                        return undefined;
                      }

                      const filteredList = list.filter((listItem) => listItem.template.type === item.template.type);
                      let itemNumber = 0;

                      if (filteredList.length > 1) {
                        itemNumber = filteredList.findIndex((listItem) => listItem.id === item.id) + 1;
                      }

                      const label = channels.find((channel) => channel.channelType === item.template.type)?.label;

                      return {
                        label: item.name ? item.name : label + (itemNumber > 0 ? ` (${itemNumber})` : ''),
                        value: item.uuid,
                      };
                    })
                    .filter((item) => item !== undefined) as any[]
                }
                {...field}
                data-test-id="previous-step-dropdown"
                disabled={readonly}
              />
            );
          }}
        />
      </Grid.Col>
      <Grid.Col span={3}>
        <Controller
          control={control}
          name={`steps.${stepIndex}.filters.0.children.${index}.stepType`}
          defaultValue=""
          render={({ field }) => {
            return (
              <Select
                placeholder="Select type"
                data={[
                  {
                    label: 'Read',
                    value: PreviousStepTypeEnum.READ,
                  },
                  {
                    label: 'Unread',
                    value: PreviousStepTypeEnum.UNREAD,
                  },
                  {
                    label: 'Seen',
                    value: PreviousStepTypeEnum.SEEN,
                  },
                  {
                    label: 'Unseen',
                    value: PreviousStepTypeEnum.UNSEEN,
                  },
                ]}
                {...field}
                data-test-id="previous-step-type-dropdown"
                disabled={readonly}
              />
            );
          }}
        />
      </Grid.Col>
      <Grid.Col span={1}>
        <DeleteStepButton
          variant="outline"
          size="md"
          mt={30}
          disabled={readonly}
          onClick={() => {
            remove(index);
          }}
        >
          <Trash />
        </DeleteStepButton>
      </Grid.Col>
    </>
  );
};
