import { useId } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { RiBookMarkedLine, RiInputField } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { useReactEmailPolling } from '@/hooks/use-react-email-polling';
import { useWorkflow } from '../../workflow-provider';
import { ReactEmailNotPublished } from './react-email-not-published';

const REACT_EMAIL_CONTROLS_DOCS_LINK = 'https://docs.novu.co/framework/content/react-email#controlschema';

function ControlsIllustration() {
  const id = useId();
  const grad0 = `${id}-g0`;
  const grad1 = `${id}-g1`;

  return (
    <svg width="136" height="60" viewBox="0 0 136 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="8.5" width="135" height="43" rx="7.5" stroke="#CACFD8" />
      <rect x="4.5" y="12.5" width="127" height="35" rx="5.5" fill="white" />
      <rect x="4.5" y="12.5" width="127" height="35" rx="5.5" stroke="#F2F5F8" />
      <rect x="16" y="24" width="44" height="5" rx="2.5" fill={`url(#${grad0})`} />
      <rect x="16" y="31" width="77" height="5" rx="2.5" fill={`url(#${grad1})`} />
      <defs>
        <linearGradient id={grad0} x1="5.36264" y1="26.1257" x2="67.011" y2="26.1257" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F1EFEF" />
          <stop offset="0.48" stopColor="#F9F8F8" />
          <stop offset="0.992158" stopColor="#F9F8F8" stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id={grad1} x1="-2.61538" y1="33.1257" x2="105.269" y2="33.1257" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F1EFEF" />
          <stop offset="0.48" stopColor="#F9F8F8" />
          <stop offset="0.992158" stopColor="#F9F8F8" stopOpacity="0.75" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ReactEmailNoControlsEmptyState() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-6">
      <div className="flex w-full flex-col items-center gap-4">
        <div className="flex w-full flex-col items-center justify-center py-2">
          <ControlsIllustration />
        </div>
        <div className="flex flex-col items-center justify-center gap-1">
          <p className="text-sm font-medium">
            No <code className="font-mono">controlSchema</code> defined
          </p>
          <span className="text-neutral-alpha-600 w-3/4 text-center text-xs">
            This React Email template doesn't expose any editable fields. Define a{' '}
            <code className="font-mono">controlSchema</code> in your code to manage content from the dashboard.
          </span>
        </div>
      </div>
      <div className="flex items-center justify-center p-1.5">
        <Link
          to={REACT_EMAIL_CONTROLS_DOCS_LINK}
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center gap-1.5 text-xs text-neutral-600 underline"
        >
          <RiBookMarkedLine className="size-4" />
          View docs
        </Link>
      </div>
    </div>
  );
}

export const EmailBodyReactEmail = () => {
  const { control } = useFormContext();
  const stepResolverHash = useWatch({ name: 'stepResolverHash', control });
  const { step, workflow } = useWorkflow();

  useReactEmailPolling();

  if (!stepResolverHash) {
    return <ReactEmailNotPublished workflowId={workflow?.workflowId ?? ''} stepId={step?.stepId ?? ''} />;
  }

  return (
    <div className="h-full overflow-y-auto bg-[#fbfbfb] px-4 py-4">
      <div className="flex flex-col gap-2">
        <Accordion
          className="bg-neutral-alpha-50 border-neutral-alpha-200 flex w-full flex-col gap-2 rounded-lg border p-2 text-sm"
          defaultValue="controls"
          type="single"
          collapsible
        >
          <AccordionItem value="controls">
            <AccordionTrigger className="flex w-full items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <RiInputField className="text-feature size-5" />
                <span className="text-sm font-medium">Custom step controls</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="bg-background rounded-md border border-dashed p-3">
                <ReactEmailNoControlsEmptyState />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
};
