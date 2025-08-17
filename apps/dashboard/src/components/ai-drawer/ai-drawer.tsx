import { InkeepEmbeddedSearchAndChat, InkeepEmbeddedSearchAndChatProps } from '@inkeep/cxkit-react';
import { forwardRef, useEffect, useRef } from 'react';
import { RiCloseLine } from 'react-icons/ri';
import { CompactButton } from '@/components/primitives/button-compact';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';

type AiDrawerProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
};

export const AiDrawer = forwardRef<HTMLDivElement, AiDrawerProps>(({ isOpen, onOpenChange, initialQuery }, ref) => {
  const searchFunctionsRef = useRef<any>(null);
  const chatFunctionsRef = useRef<any>(null);

  const hasInkeep = !!import.meta.env.VITE_INKEEP_API_KEY;

  useEffect(() => {
    if (isOpen && hasInkeep) {
      setTimeout(() => {
        if (initialQuery?.trim()) {
          chatFunctionsRef.current?.updateInputMessage(initialQuery);
        }
        chatFunctionsRef.current?.focusInput();
      }, 100);
    }
  }, [isOpen, initialQuery]);

  if (!hasInkeep) {
    return null;
  }

  const inkeepConfig: InkeepEmbeddedSearchAndChatProps = {
    defaultView: 'chat',
    baseSettings: {
      apiKey: import.meta.env.VITE_INKEEP_API_KEY,
      organizationDisplayName: 'Novu',
      primaryBrandColor: '#DD2476',
      theme: {
        styles: [
          {
            key: 'custom-theme',
            type: 'style',
            value: `
                .ikp-ai-chat-wrapper {
                  height: 100%;
                }
              `,
          },
        ],
      },
    },
    searchSettings: {
      searchFunctionsRef,
    },
    aiChatSettings: {
      aiAssistantName: 'Novu AI',
      chatFunctionsRef,
    },
    shouldAutoFocusInput: true,
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        ref={ref}
        side="right"
        className="w-[600px] !max-w-none p-0 h-[calc(100vh)] [&>[data-close-button]]:hidden"
      >
        <VisuallyHidden>
          <SheetTitle>AI Assistant</SheetTitle>
          <SheetDescription>Get help and answers from Novu AI</SheetDescription>
        </VisuallyHidden>

        <div className="h-[calc(100vh)]">
          <InkeepEmbeddedSearchAndChat {...inkeepConfig} />
        </div>
      </SheetContent>
    </Sheet>
  );
});

AiDrawer.displayName = 'AiDrawer';
