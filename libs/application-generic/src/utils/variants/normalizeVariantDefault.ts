import { ITemplateVariable } from '@novu/shared';

export const normalizeVariantDefault = (items: ITemplateVariable[]) => {
  return items.map((item) => {
    if (item.defaultValue === '') {
      item.defaultValue = undefined;
    }

    return item;
  });
};
