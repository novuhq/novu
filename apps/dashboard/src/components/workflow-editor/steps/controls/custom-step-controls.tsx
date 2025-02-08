import { ConfirmationModal } from '@/components/confirmation-modal';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { InlineToast } from '@/components/primitives/inline-toast';
import { Separator } from '@/components/primitives/separator';
import { Switch } from '@/components/primitives/switch';
import { SidebarContent } from '@/components/side-navigation/sidebar';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { WorkflowOriginEnum } from '@/utils/enums';
import { buildDefaultValuesOfDataSchema } from '@/utils/schema';
import { cn } from '@/utils/ui';
import { type ControlsMetadata } from '@novu/shared';
import { RJSFSchema } from '@rjsf/utils';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { RiBookMarkedLine, RiInputField, RiQuestionLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { useWorkflow } from '../../workflow-provider';
import { JsonForm } from './json-form';

type CustomStepControlsProps = {
  dataSchema: ControlsMetadata['dataSchema'];
  origin: WorkflowOriginEnum;
  className?: string;
};

const CONTROLS_DOCS_LINK = 'https://docs.novu.co/concepts/controls';

export const CustomStepControls = (props: CustomStepControlsProps) => {
  const { className, dataSchema, origin } = props;
  const [isRestoreDefaultModalOpen, setIsRestoreDefaultModalOpen] = useState(false);
  const { step } = useWorkflow();
  const [isOverridden, setIsOverridden] = useState(() => Object.keys(step?.controls.values ?? {}).length > 0);
  const { reset } = useFormContext();
  const { saveForm } = useSaveForm();

  if (origin !== WorkflowOriginEnum.EXTERNAL || Object.keys(dataSchema?.properties ?? {}).length === 0) {
    return (
      <SidebarContent size="md">
        <Accordion
          className={cn(
            'bg-neutral-alpha-50 border-neutral-alpha-200 flex w-full flex-col gap-2 rounded-lg border p-2 text-sm',
            className
          )}
          defaultValue="controls"
          type="single"
          collapsible
        >
          <AccordionItem value="controls">
            <AccordionTrigger className="flex w-full items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <RiInputField className="text-feature size-5" />
                <span className="text-sm font-medium">Code-defined step controls</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="bg-background rounded-md border border-dashed p-3">
                <div className="flex w-full flex-col items-center justify-center gap-6">
                  <div className="flex w-full flex-col items-center gap-4">
                    <div className="flex w-full flex-col items-center justify-center py-2">
                      <div className="w-1/3 rounded-md border border-neutral-300 p-1">
                        <div className="flex w-full flex-col items-start justify-center gap-2 rounded-sm border border-neutral-100 bg-white p-1">
                          <div className="bg-neutral-alpha-100 h-[5px] w-2/5 rounded-sm" />
                          <div className="bg-neutral-alpha-100 h-[5px] w-4/5 rounded-sm" />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1">
                      <p className="text-sm font-medium">No controls defined yet</p>
                      <span className="text-neutral-alpha-600 w-3/4 text-center text-xs">
                        Define step controls to render fields here. This lets your team collaborate and ensure changes
                        are validated in code.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center p-1.5">
                    <Link
                      to={CONTROLS_DOCS_LINK}
                      target="_blank"
                      className="flex items-center gap-1.5 text-xs text-neutral-600 underline"
                    >
                      <RiBookMarkedLine className="size-4" />
                      View docs
                    </Link>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </SidebarContent>
    );
  }

  return (
    <SidebarContent size="md">
      <ConfirmationModal
        open={isRestoreDefaultModalOpen}
        onOpenChange={setIsRestoreDefaultModalOpen}
        onConfirm={async () => {
          const defaultValues = buildDefaultValuesOfDataSchema(step?.controls.dataSchema ?? {});
          reset(defaultValues);
          saveForm(true);
          setIsRestoreDefaultModalOpen(false);
          setIsOverridden(false);
        }}
        title="Proceeding will restore controls to defaults."
        description="All edits will be discarded, and defaults will be restored from the code."
        confirmButtonText="Proceed anyway"
      />
      <div className="mb-3 mt-2 flex w-full items-center justify-between">
        <div className="flex flex-col justify-center gap-1">
          <span className="block text-sm">Override code defined defaults</span>
          <span className="text-xs text-neutral-400">
            Code-defined defaults are read-only by default, you can allow overrides using this toggle.
          </span>
        </div>
        <Switch
          checked={isOverridden}
          onCheckedChange={(checked) => {
            if (!checked) {
              setIsRestoreDefaultModalOpen(true);
              return;
            }
            setIsOverridden(checked);
          }}
        />
      </div>
      <Separator className="mb-3" />

      <Accordion
        className={cn(
          'bg-neutral-alpha-50 border-neutral-alpha-200 flex w-full flex-col gap-2 rounded-lg border p-2 text-sm',
          className
        )}
        type="single"
        defaultValue="controls"
        collapsible
      >
        <AccordionItem value="controls">
          <AccordionTrigger className="flex w-full items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <RiInputField className="text-feature size-5" />
              <span className="text-sm font-medium">Code-defined step controls</span>
            </div>
          </AccordionTrigger>

          <AccordionContent>
            <div className="bg-background rounded-md border border-dashed p-3">
              <JsonForm schema={(dataSchema as RJSFSchema) || {}} disabled={!isOverridden} />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <OverrideMessage isOverridden={isOverridden} />
    </SidebarContent>
  );
};

const OverrideMessage = ({ isOverridden }: { isOverridden: boolean }) => {
  const fadeAnimation = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.1 },
  };

  return (
    <motion.div layout {...fadeAnimation} className="relative min-h-10">
      {isOverridden ? (
        <InlineToast
          description="Custom controls defined in the code have been overridden. Disable overrides to restore the original."
          className="w-full px-3"
        />
      ) : (
        <Link
          target="_blank"
          to={CONTROLS_DOCS_LINK}
          className="mt-2 flex items-center gap-1 text-xs text-neutral-600 hover:underline"
        >
          <RiQuestionLine className="size-4" /> Learn more about code-defined controls.
        </Link>
      )}
    </motion.div>
  );
};
