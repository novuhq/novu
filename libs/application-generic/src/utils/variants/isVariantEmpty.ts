import { NotificationStepVariantCommand } from '../../value-objects/notification-step-variant.command';

/** determine if the variant has no filters / conditions */
export const isVariantEmpty = (variant: NotificationStepVariantCommand): boolean => {
  return !variant.filters?.some((filter) => filter.children?.length);
};
