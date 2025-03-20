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
import { ExternalLink } from '@/components/shared/external-link';
import { CreateWorkflowForm } from '@/components/workflow-editor/create-workflow-form';
import { useEnvironment } from '@/context/environment/hooks';
import { useCreateWorkflow } from '@/hooks/use-create-workflow';
import { useOnElementUnmount } from '@/hooks/use-on-element-unmount';
import { buildRoute, ROUTES } from '@/utils/routes';
import { useState } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';

export function CreateWorkflowPage() {
  const navigate = useNavigate();
  const { submit, isLoading: isCreating } = useCreateWorkflow();
  const [open, setOpen] = useState(true);
  const { currentEnvironment } = useEnvironment();

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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent ref={unmountRef}>
        <SheetHeader>
          <SheetTitle>Create workflow</SheetTitle>
          <div>
            <SheetDescription>
              Define the steps to notify subscribers using channels like in-app, email, and more.{' '}
              <ExternalLink href="https://docs.novu.co/concepts/workflows">Learn more</ExternalLink>
            </SheetDescription>
          </div>
        </SheetHeader>
        <Separator />
        <SheetMain>
          <CreateWorkflowForm onSubmit={submit} />
        </SheetMain>
        <Separator />
        <SheetFooter>
          <Button
            isLoading={isCreating}
            trailingIcon={RiArrowRightSLine}
            variant="secondary"
            mode="gradient"
            type="submit"
            form="create-workflow"
          >
            Create workflow
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
