import { ITemplateVariable } from '@novu/shared';

export const normalizeVariantDefault = (items: ITemplateVariable[]) => {
  return items.map((item) => {
    if (item.defaultValue === '') {
      // eslint-disable-next-line no-param-reassign
      item.defaultValue = undefined;
    }

    return item;
  });
};
