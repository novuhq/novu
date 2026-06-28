import { forwardRef } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { IS_DOCS_ASSISTANT_ENABLED } from '@/config';
import { DocsAssistantChat } from '@/components/docs-assistant/docs-assistant-chat';

type AiDrawerProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
};

export const AiDrawer = forwardRef<HTMLDivElement, AiDrawerProps>(({ isOpen, onOpenChange, initialQuery }, ref) => {
  if (!IS_DOCS_ASSISTANT_ENABLED) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        ref={ref}
        side="right"
        className="w-[600px] max-w-none! p-0 h-[calc(100vh)] *:data-close-button:hidden"
      >
        <VisuallyHidden>
          <SheetTitle>AI Assistant</SheetTitle>
          <SheetDescription>Get help and answers from Novu AI</SheetDescription>
        </VisuallyHidden>

        <div className="h-[calc(100vh)]">
          <DocsAssistantChat initialQuery={initialQuery} onClose={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
});

AiDrawer.displayName = 'AiDrawer';
