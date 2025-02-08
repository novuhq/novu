import { RiQuestionLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { RiInputField } from 'react-icons/ri';

import { Button } from '@/components/primitives/button';
import { Panel, PanelContent, PanelHeader } from '@/components/primitives/panel';

export const EditStepConditionsLayout = ({
  stepName,
  disabled,
  onSubmit,
  children,
}: {
  stepName?: string;
  disabled?: boolean;
  onSubmit?: () => void;
  children: React.ReactNode;
}) => {
  return (
    <form className="flex h-full flex-col overflow-hidden" onSubmit={onSubmit}>
      <div className="flex flex-col gap-3 overflow-y-auto overflow-x-hidden px-3 py-5">
        <Panel className="overflow-initial">
          <PanelHeader>
            <RiInputField className="text-feature size-4" />
            <span className="text-neutral-950">Step conditions for — {stepName}</span>
          </PanelHeader>
          <PanelContent className="flex flex-col gap-2 border-solid">{children}</PanelContent>
        </Panel>
        <Link
          target="_blank"
          to={'https://docs.novu.co/workflow/step-conditions'}
          className="mt-2 flex w-max items-center gap-1 text-xs text-neutral-600 hover:underline"
        >
          <RiQuestionLine className="size-4" /> Learn more about conditional step execution
        </Link>
      </div>
      <div className="mt-auto flex justify-end border-t border-neutral-200 p-3">
        <Button type="submit" variant="secondary" disabled={disabled}>
          Save Conditions
        </Button>
      </div>
    </form>
  );
};
