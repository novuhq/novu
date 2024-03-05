import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import localforage from 'localforage';
import { addWeeks } from 'date-fns';
import { IGroupedBlueprint } from '@novu/shared';

import { getBlueprintsGroupedByCategory } from '../../notification-templates';
import { QueryKeys } from '../../query.keys';
import { IBlueprintTemplate } from '../../types';
import { getWorkflowBlueprintDetails } from '../../../utils';

export interface IBlueprintsGrouped {
  name: string;
  blueprints: IBlueprintTemplate[];
}

interface IBlueprintsGroupedAndPopular {
  general: IBlueprintsGrouped[];
  popular: IBlueprintsGrouped;
}

const mapGroup = (group: IGroupedBlueprint): IBlueprintsGrouped => ({
  name: group.name,
  blueprints: group.blueprints.map((template) => {
    const { name, iconName } = getWorkflowBlueprintDetails(template.name);

    return {
      ...template,
      name,
      iconName,
    };
  }),
});

const BLUEPRINTS_CACHE_KEY = 'blueprints';
const BLUEPRINTS_CACHE_VALID_BY = 'blueprints_valid_by';

const getCachedBlueprints = async (): Promise<IBlueprintsGroupedAndPopular | null> => {
  const validByTimestamp = (await localforage.getItem<number>(BLUEPRINTS_CACHE_VALID_BY)) || 0;
  const now = Date.now();

  if (now <= validByTimestamp) {
    return await localforage.getItem<IBlueprintsGroupedAndPopular>(BLUEPRINTS_CACHE_KEY);
  }

  return null;
};

export function useFetchBlueprints(
  options: UseQueryOptions<IBlueprintsGroupedAndPopular, any, IBlueprintsGroupedAndPopular> = {}
) {
  const { data, ...rest } = useQuery<IBlueprintsGroupedAndPopular>(
    [QueryKeys.blueprintsList],
    async () => {
      const cachedBlueprints = await getCachedBlueprints();
      if (cachedBlueprints) {
        return cachedBlueprints;
      }

      const { general, popular } = await getBlueprintsGroupedByCategory();
      const blueprints = {
        general: general.map<IBlueprintsGrouped>((group) => mapGroup(group)),
        popular: mapGroup(popular),
      };

      await localforage.setItem(BLUEPRINTS_CACHE_KEY, blueprints);
      await localforage.setItem(BLUEPRINTS_CACHE_VALID_BY, +addWeeks(new Date(), 1));

      return blueprints;
    },
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchInterval: false,
      ...options,
    }
  );

  return {
    blueprintsGroupedAndPopular: data,
    ...rest,
  };
}
