import { Button } from '@/components/primitives/button';
import { Separator } from '@/components/primitives/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetMain,
  SheetTitle,
} from '@/components/primitives/sheet';
import { Skeleton } from '@/components/primitives/skeleton';
import { ExternalLink } from '@/components/shared/external-link';
import { CreateWorkflowForm } from '@/components/workflow-editor/create-workflow-form';
import { useEnvironment } from '@/context/environment/hooks';
import { useCreateWorkflow } from '@/hooks/use-create-workflow';
import { useDuplicateWorkflow } from '@/hooks/use-duplicate-workflow';
import { useFetchWorkflow } from '@/hooks/use-fetch-workflow';
import { useOnElementUnmount } from '@/hooks/use-on-element-unmount';
import { buildRoute, ROUTES } from '@/utils/routes';
import { DuplicateWorkflowDto } from '@novu/shared';
import { useState } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';

type NewWorkflowDrawerProps = {
  mode: 'create' | 'duplicate';
  workflowId?: string;
};

export function NewWorkflowDrawer({ mode, workflowId }: NewWorkflowDrawerProps) {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const [open, setOpen] = useState(true);

  const { workflow, isPending: isLoadingWorkflow } = useFetchWorkflow({
    workflowSlug: mode === 'duplicate' ? workflowId : undefined,
  });

  const duplicateWorkflow = useDuplicateWorkflow({ workflowSlug: workflowId || '' });
  const createWorkflow = useCreateWorkflow();
  const { submit, isLoading: isSubmitting } = mode === 'duplicate' ? duplicateWorkflow : createWorkflow;

  const { ref: unmountRef } = useOnElementUnmount({
    callback: () => {
      navigate(
        buildRoute(ROUTES.WORKFLOWS, {
          environmentSlug: currentEnvironment?.slug ?? '',
        })
      );
    },
    condition: !open,
  });

  const template: DuplicateWorkflowDto | undefined =
    mode === 'duplicate' && workflow
      ? {
          name: `${workflow.name} (Copy)`,
          description: workflow.description,
          tags: workflow.tags,
          isTranslationEnabled: workflow.isTranslationEnabled,
        }
      : undefined;

  const title = mode === 'create' ? 'Create workflow' : 'Duplicate workflow';
  const buttonText = mode === 'create' ? 'Create workflow' : 'Duplicate workflow';
  const isLoadingTemplate = mode === 'duplicate' && isLoadingWorkflow;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent ref={unmountRef}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <div>
            <SheetDescription>
              Define the steps to notify subscribers using channels like in-app, email, and more.{' '}
              <ExternalLink href="https://docs.novu.co/platform/concepts/workflows">Learn more</ExternalLink>
            </SheetDescription>
          </div>
        </SheetHeader>
        <Separator />
        <SheetMain>
          {isLoadingTemplate ? (
            <CreateWorkflowFormSkeleton />
          ) : (
            <CreateWorkflowForm onSubmit={submit} template={template} />
          )}
        </SheetMain>
        <Separator />
        <SheetFooter>
          <Button
            isLoading={isSubmitting}
            trailingIcon={RiArrowRightSLine}
            variant="secondary"
            mode="gradient"
            type="submit"
            form="create-workflow"
          >
            {buttonText}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function CreateWorkflowFormSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2">
          <Skeleton className="h-4 w-16" /> {/* Name label */}
        </div>
        <Skeleton className="h-9 w-full" /> {/* Name input */}
      </div>

      <div>
        <div className="mb-2">
          <Skeleton className="h-4 w-24" /> {/* Identifier label */}
        </div>
        <Skeleton className="h-9 w-full" /> {/* Identifier input */}
      </div>

      <Separator />

      <div>
        <div className="mb-2">
          <Skeleton className="h-4 w-20" /> {/* Tags label */}
        </div>
        <Skeleton className="h-9 w-full" /> {/* Tags input */}
      </div>

      <div>
        <div className="mb-2">
          <Skeleton className="h-4 w-24" /> {/* Description label */}
        </div>
        <Skeleton className="h-24 w-full" /> {/* Description textarea */}
      </div>
    </div>
  );
}
