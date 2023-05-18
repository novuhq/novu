/* eslint-disable max-len */
/* cSpell:disable */
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { IconName } from '@fortawesome/fontawesome-svg-core';

import { QueryKeys } from '../../query.keys';

export interface IBlueprintsGrouped {
  name: string;
  templates: { name: string; description: string; iconName: IconName }[];
}

interface IBlueprintsGroupedAndPopular {
  groupedBlueprints: IBlueprintsGrouped[];
  popularBlueprints: { id: string; name: string; description: string; iconName: IconName }[];
}

const TEMPLATES_GROUPED = [
  {
    name: 'Collaboration',
    templates: [
      {
        id: '1',
        name: ':fa-regular fa-message: Comments',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
      },
      {
        id: '2',
        name: ':fa-solid fa-user-check: Mentions',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
      },
      {
        id: '3',
        name: ':fa-solid fa-reply: Reply',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
      },
    ],
  },
  {
    name: 'Growth',
    templates: [
      {
        id: '4',
        name: ':fa-regular fa-hand: Welcome message',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
      },
      {
        id: '5',
        name: ':fa-solid fa-envelope-open-text: Invite message',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
      },
      {
        id: '6',
        name: ':fa-solid fa-gift: Refferal link',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
      },
    ],
  },
  {
    name: 'Authentification',
    templates: [
      {
        id: '7',
        name: ':fa-solid fa-wand-magic-sparkles: Magic link',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
      },
      {
        id: '8',
        name: ':fa-solid fa-unlock: Password change',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
      },
      {
        id: '9',
        name: ':fa-solid fa-unlock: Password change2',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
      },
      {
        id: '10',
        name: ':fa-solid fa-unlock: Password change3',
        description:
          'Lorem ipsum dolor sit amet consectetur adipisicing elit. Cupiditate quas totam quod beatae. Ipsam quasi fugiat commodi adipisci eligendi necessitatibus cumque aliquam, dicta natus cupiditate suscipit voluptatum rerum debitis. Ipsum!',
      },
    ],
  },
];

const getTemplateDetails = (templateName: string): { name: string; iconName: IconName } => {
  const regexResult = /^:.{1,}: /.exec(templateName);
  let name = '';
  let iconName = 'fa-solid fa-question';
  if (regexResult !== null) {
    name = templateName.replace(regexResult[0], '').trim();
    iconName = regexResult[0].replace(/:/g, '').trim();
  }

  return { name, iconName: iconName as IconName };
};

export function useFetchBlueprints(
  options: UseQueryOptions<IBlueprintsGroupedAndPopular, any, IBlueprintsGroupedAndPopular> = {}
) {
  const { data, ...rest } = useQuery<IBlueprintsGroupedAndPopular>(
    [QueryKeys.blueprintsList],
    () => {
      return new Promise((resolve) => {
        const groupedBlueprints = TEMPLATES_GROUPED.map((group) => ({
          name: group.name,
          templates: group.templates.map((template) => {
            const { name, iconName } = getTemplateDetails(template.name);

            return {
              ...template,
              name,
              iconName,
            };
          }),
        }));

        setTimeout(() => {
          resolve({
            groupedBlueprints,
            popularBlueprints: groupedBlueprints[0].templates.slice(0, 3),
          });
        }, 3000);
      });
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
