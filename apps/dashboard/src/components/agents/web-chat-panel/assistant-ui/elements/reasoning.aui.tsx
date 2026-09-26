import { type ReasoningMessagePartComponent } from '@assistant-ui/react';
import { memo, type PropsWithChildren } from 'react';
import { RiArrowDownSLine, RiBrainLine } from 'react-icons/ri';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/primitives/collapsible';
import { MarkdownText } from './markdown-text';

export function ReasoningRoot({ streaming, children }: PropsWithChildren<{ streaming?: boolean }>) {
  return (
    <Collapsible defaultOpen={streaming} className="mb-3 w-full">
      {children}
    </Collapsible>
  );
}

export function ReasoningTrigger({ active }: { active?: boolean }) {
  return (
    <CollapsibleTrigger className="text-text-soft hover:text-text-strong group flex items-center gap-2 py-1.5 text-sm">
      <RiBrainLine className="size-4 shrink-0" />
      <span className="leading-none">{active ? 'Reasoning' : 'Reasoning'}</span>
      <RiArrowDownSLine className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );
}

export function ReasoningContent({ children, ...props }: PropsWithChildren<{ 'aria-busy'?: boolean }>) {
  return (
    <CollapsibleContent className="text-text-soft overflow-hidden text-sm" {...props}>
      <div className="max-h-64 overflow-y-auto ps-6 pt-2 pb-2 leading-relaxed">{children}</div>
    </CollapsibleContent>
  );
}

export function ReasoningText({ children }: PropsWithChildren) {
  return <div className="space-y-4">{children}</div>;
}

const ReasoningImpl: ReasoningMessagePartComponent = () => <MarkdownText />;

// biome-ignore lint/style/useComponentExportOnlyModules: assistant-ui part renderer
export const Reasoning = memo(ReasoningImpl) as unknown as ReasoningMessagePartComponent;
Reasoning.displayName = 'Reasoning';
