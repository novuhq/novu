import { NotificationStepVariantCommand } from '../../usecases/create-workflow';

/** determine if the variant has no filters / conditions */
export const isVariantEmpty = (
  variant: NotificationStepVariantCommand,
): boolean => {
  return !variant.filters?.some((filter) => filter.children?.length);
};
