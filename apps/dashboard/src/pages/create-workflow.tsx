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
import { useCreateWorkflow } from '@/hooks/use-create-workflow';
import { useOnElementUnmount } from '@/hooks/use-on-element-unmount';
import { useRef, useState } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';

export function CreateWorkflowPage() {
  const navigate = useNavigate();

  const { submit, isLoading: isCreating } = useCreateWorkflow();
  const [open, setOpen] = useState(true);
  const sheetRef = useRef<HTMLDivElement>(null);

  useOnElementUnmount({
    element: sheetRef.current,
    callback: () => {
      navigate(-1);
    },
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent ref={sheetRef} onOpenAutoFocus={(e) => e.preventDefault()}>
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
