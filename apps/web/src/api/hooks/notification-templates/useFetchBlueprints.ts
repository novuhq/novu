import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { IconName } from '@fortawesome/fontawesome-svg-core';
import { IGroupedBlueprint } from '@novu/shared';

import { getBlueprintsGroupedByCategory } from '../../notification-templates';
import { QueryKeys } from '../../query.keys';
import { IBlueprintTemplate } from '../../types';

export interface IBlueprintsGrouped {
  name: string;
  blueprints: IBlueprintTemplate[];
}

interface IBlueprintsGroupedAndPopular {
  general: IBlueprintsGrouped[];
  popular: IBlueprintsGrouped;
}

const getTemplateDetails = (templateName: string): { name: string; iconName: IconName } => {
  const regexResult = /^:.{1,}:/.exec(templateName);
  let name = '';
  let iconName = 'fa-solid fa-question';
  if (regexResult !== null) {
    name = templateName.replace(regexResult[0], '').trim();
    iconName = regexResult[0].replace(/:/g, '').trim();
  }

  return { name, iconName: iconName as IconName };
};

const mapGroup = (group: IGroupedBlueprint): IBlueprintsGrouped => ({
  name: group.name,
  blueprints: group.blueprints.map((template) => {
    const { name, iconName } = getTemplateDetails(template.name);

    return {
      ...template,
      name,
      iconName,
    };
  }),
});

export function useFetchBlueprints(
  options: UseQueryOptions<IBlueprintsGroupedAndPopular, any, IBlueprintsGroupedAndPopular> = {}
) {
  const { data, ...rest } = useQuery<IBlueprintsGroupedAndPopular>(
    [QueryKeys.blueprintsList],
    async () => {
      const { general, popular } = await getBlueprintsGroupedByCategory();

      return {
        general: general.map<IBlueprintsGrouped>((group) => mapGroup(group)),
        popular: mapGroup(popular),
      };
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
