import { Skeleton } from '@/components/primitives/skeleton';
import { EditStepConditionsLayout } from './edit-step-conditions-layout';

export const EditStepConditionsFormSkeleton = () => {
  return (
    <EditStepConditionsLayout stepName="..." disabled>
      <Skeleton className="h-7 w-60" />
      <Skeleton className="h-7" />
      <Skeleton className="h-7" />
    </EditStepConditionsLayout>
  );
};
