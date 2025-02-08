import { StepTypeEnum } from '@novu/shared';
import React from 'react';
import { RiCloseFill, RiEdit2Line, RiPencilRuler2Line } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';

import { Notification5Fill } from '@/components/icons';
import { Button } from '@/components/primitives/button';
import { Separator } from '@/components/primitives/separator';
import { Skeleton } from '@/components/primitives/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { WorkflowOriginEnum } from '@/utils/enums';
import { CompactButton } from '../../primitives/button-compact';

const SingleLineSkeleton = () => {
  return (
    <div className="flex h-full flex-col gap-1">
      <Skeleton className="h-10 w-full" />
    </div>
  );
};

const STEP_TYPE_TO_SKELETON_CONTENT: Record<StepTypeEnum | string, () => React.JSX.Element | null> = {
  [StepTypeEnum.EMAIL]: () => {
    return (
      <div className="flex h-full flex-col gap-1">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-full w-full" />
      </div>
    );
  },
  [StepTypeEnum.CHAT]: SingleLineSkeleton,
  [StepTypeEnum.IN_APP]: () => {
    return (
      <>
        <div className="flex items-center gap-2.5 text-sm font-medium">
          <Notification5Fill className="size-3" />
          <span>In-App template editor</span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-neutral-100 p-1">
          <div className="flex gap-1">
            <Skeleton className="h-10 min-w-10" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-32 w-full" />
        </div>
      </>
    );
  },
  [StepTypeEnum.SMS]: SingleLineSkeleton,
  [StepTypeEnum.PUSH]: SingleLineSkeleton,
  [StepTypeEnum.DIGEST]: () => null,
  [StepTypeEnum.DELAY]: () => null,
  [StepTypeEnum.TRIGGER]: () => null,
  [StepTypeEnum.CUSTOM]: () => null,
};

export const StepSkeleton = ({
  stepType,
  workflowOrigin,
}: {
  stepType?: StepTypeEnum;
  workflowOrigin?: WorkflowOriginEnum;
}) => {
  const navigate = useNavigate();

  const SkeletonContent = STEP_TYPE_TO_SKELETON_CONTENT[stepType ?? ''];

  return (
    <div className="flex h-full flex-1 flex-col">
      <header className="flex flex-row items-center gap-3 px-3 py-1.5">
        <div className="mr-auto flex items-center gap-2.5 text-sm font-medium">
          <RiEdit2Line className="size-4" />
          <span>Configure Template</span>
        </div>
        <Tabs defaultValue="editor" className="ml-auto">
          <TabsList className="w-min">
            <TabsTrigger value="editor" className="gap-1.5" disabled>
              <RiPencilRuler2Line className="size-5 p-0.5" />
              <span>Editor</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5" disabled>
              <Notification5Fill className="size-5 p-0.5" />
              <span>Preview</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <CompactButton
          icon={RiCloseFill}
          className="size-6"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate('../', { relative: 'path' });
          }}
        >
          <span className="sr-only">Close</span>
        </CompactButton>
      </header>
      <Separator />
      <div className="flex h-full w-full flex-col gap-3 px-3 py-3.5">
        {workflowOrigin && workflowOrigin !== WorkflowOriginEnum.EXTERNAL ? (
          <SkeletonContent />
        ) : (
          <SingleLineSkeleton />
        )}
      </div>
      <Separator />
      <footer className="flex justify-end px-3 py-3.5">
        <Button className="ml-auto" variant="primary" disabled>
          Save step
        </Button>
      </footer>
    </div>
  );
};
