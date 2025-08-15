import {
  InkeepEmbeddedSearch,
  InkeepEmbeddedSearchAndChat,
  InkeepEmbeddedSearchAndChatProps,
  type InkeepEmbeddedSearchProps,
} from '@inkeep/cxkit-react';
import { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/primitives/dialog';
import { cn } from '@/utils/ui';

type InkeepSearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  organizationId?: string;
  integrationId?: string;
  initialQuery?: string;
};

export function InkeepSearchModal({ isOpen, onClose, apiKey, initialQuery }: InkeepSearchModalProps) {
  const searchFunctionsRef = useRef<any>(null);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Focus the search input and set initial query when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the component is mounted
      setTimeout(() => {
        searchFunctionsRef.current?.focusInput();
        if (initialQuery) {
          searchFunctionsRef.current?.updateQuery(initialQuery);
        }
      }, 100);
    }
  }, [isOpen, initialQuery]);

  const inkeepConfig: InkeepEmbeddedSearchAndChatProps = {
    defaultView: 'chat',
    baseSettings: {
      apiKey,
      organizationDisplayName: 'Novu',
      primaryBrandColor: '#DD2476',
    },
    aiChatSettings: {
      aiAssistantName: 'Novu AI',
    },
    searchSettings: {
      placeholder: 'Ask AI anything about Novu...',
      searchFunctionsRef,
    },
    shouldAutoFocusInput: true,
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn('max-w-4xl w-[90vw] h-[80vh] p-0 gap-0', 'bg-background border-neutral-200', 'overflow-hidden')}
      >
        <DialogHeader className="px-6 py-4 border-b border-neutral-200 flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-8 bg-gradient-to-br from-[#DD2476] to-[#FF512F] flex items-center justify-center">
              <span className="text-white text-sm font-semibold">AI</span>
            </div>
            <DialogTitle className="text-lg font-medium">Ask Novu AI</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <div className="h-full">
            <InkeepEmbeddedSearchAndChat {...inkeepConfig} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
