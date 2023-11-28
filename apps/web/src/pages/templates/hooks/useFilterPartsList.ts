import { useMemo } from 'react';
import { FilterPartTypeEnum, FILTER_TO_LABEL } from '@novu/shared';

import type { DataSelect, IFilterTypeList } from '../../../components/conditions';
import { channels } from '../../../utils/channels';
import { useStepsBefore } from './useStepsBefore';

const FILTER_PART_LIST: IFilterTypeList[] = [
  { value: FilterPartTypeEnum.PAYLOAD, label: FILTER_TO_LABEL[FilterPartTypeEnum.PAYLOAD] },
  {
    value: FilterPartTypeEnum.SUBSCRIBER,
    label: FILTER_TO_LABEL[FilterPartTypeEnum.SUBSCRIBER],
  },
  { value: FilterPartTypeEnum.TENANT, label: FILTER_TO_LABEL[FilterPartTypeEnum.TENANT] },
  { value: FilterPartTypeEnum.WEBHOOK, label: FILTER_TO_LABEL[FilterPartTypeEnum.WEBHOOK] },
  { value: FilterPartTypeEnum.IS_ONLINE, label: FILTER_TO_LABEL[FilterPartTypeEnum.IS_ONLINE] },
  {
    value: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
    label: FILTER_TO_LABEL[FilterPartTypeEnum.IS_ONLINE_IN_LAST],
  },
];

export const useFilterPartsList = ({ index = 0 }: { index?: number }) => {
  const stepsBeforeSelectedStep = useStepsBefore({ index });

  return useMemo(() => {
    const filterPartsList = [...FILTER_PART_LIST];
    if (stepsBeforeSelectedStep.length === 0) {
      return filterPartsList;
    }

    const data = stepsBeforeSelectedStep.map((item) => {
      const label = channels.find((channel) => channel.channelType === item.template.type)?.label;

      return {
        label: item.name ?? label,
        value: item.uuid,
      };
    }) as DataSelect[];

    filterPartsList.push({
      value: FilterPartTypeEnum.PREVIOUS_STEP,
      label: FILTER_TO_LABEL[FilterPartTypeEnum.PREVIOUS_STEP],
      data,
    });

    return filterPartsList;
  }, [stepsBeforeSelectedStep]);
};
