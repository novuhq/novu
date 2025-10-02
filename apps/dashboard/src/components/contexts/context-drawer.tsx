import { ContextId, ContextType, createContextKey } from '@novu/shared';
import React, { forwardRef, useState } from 'react';
import { RiBuildingLine } from 'react-icons/ri';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { TooltipProvider } from '@/components/primitives/tooltip';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import TruncatedText from '@/components/truncated-text';
import { useFormProtection } from '@/hooks/use-form-protection';
import { cn } from '@/utils/ui';
import { ContextActivity } from './context-activity';
import { ContextOverview } from './context-overview';

const tabTriggerClasses =
  'hover:data-[state=inactive]:text-foreground-950 h-11 py-3 rounded-none [&>span]:h-5 px-0 relative';

type ContextTabsProps = {
  type: ContextType;
  id: ContextId;
  readOnly?: boolean;
};

function ContextTabs(props: ContextTabsProps) {
  const { type, id, readOnly = false } = props;
  const contextKey = createContextKey(type, id);
  const [tab, setTab] = useState('overview');

  const {
    protectedOnValueChange,
    ProtectionAlert,
    ref: protectionRef,
  } = useFormProtection({
    onValueChange: setTab,
  });

  return (
    <TooltipProvider>
      <Tabs
        ref={protectionRef}
        className="flex h-full w-full flex-col"
        value={tab}
        onValueChange={protectedOnValueChange}
      >
        <header className="border-bg-soft flex h-12 w-full flex-row items-center gap-3 border-b px-5 py-5">
          <div className="flex flex-1 items-center gap-1 overflow-hidden text-sm font-medium">
            <RiBuildingLine className="size-5 p-0.5" />
            <TruncatedText className="flex-1 pr-10">Context - {contextKey}</TruncatedText>
          </div>
        </header>

        <TabsList
          variant={'regular'}
          className="border-bg-soft h-auto w-full items-center gap-6 rounded-none border-b border-t-0 bg-transparent px-5 py-0"
        >
          <TabsTrigger value="overview" className={tabTriggerClasses}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="activity-feed" className={tabTriggerClasses}>
            Activity Feed
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="h-full w-full overflow-y-auto">
          <ContextOverview type={type} id={id} readOnly={readOnly} />
        </TabsContent>
        <TabsContent value="activity-feed" className="h-full w-full overflow-y-auto">
          <ContextActivity type={type} id={id} />
        </TabsContent>

        {ProtectionAlert}
      </Tabs>
    </TooltipProvider>
  );
}

type ContextDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ContextType;
  id: ContextId;
  readOnly?: boolean;
};

export const ContextDrawer = forwardRef<HTMLDivElement, ContextDrawerProps>((props, forwardedRef) => {
  const { open, onOpenChange, type, id, readOnly = false } = props;

  return (
    <Sheet open={open} modal={false} onOpenChange={onOpenChange}>
      {/* Custom overlay since SheetOverlay does not work with modal={false} */}
      <div
        className={cn('fade-in animate-in fixed inset-0 z-50 bg-black/20 transition-opacity duration-300', {
          'pointer-events-none opacity-0': !open,
        })}
      />
      <SheetContent ref={forwardedRef} className="w-[580px]">
        <VisuallyHidden>
          <SheetTitle />
          <SheetDescription />
        </VisuallyHidden>
        <ContextTabs type={type} id={id} readOnly={readOnly} />
      </SheetContent>
    </Sheet>
  );
});

type ContextDrawerButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  contextKey: string;
  readOnly?: boolean;
};

export const ContextDrawerButton = (props: ContextDrawerButtonProps) => {
  const { contextKey, onClick, readOnly = false, ...rest } = props;
  const [open, setOpen] = useState(false);

  // Parse context key to extract type and id
  const [type, id] = contextKey.split(':') as [ContextType, ContextId];

  return (
    <>
      <button
        {...rest}
        onClick={(e) => {
          setOpen(true);
          onClick?.(e);
        }}
      />
      <ContextDrawer open={open} onOpenChange={setOpen} type={type} id={id} readOnly={readOnly} />
    </>
  );
};
