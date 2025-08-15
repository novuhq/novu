import {
  type AIChatFunctions,
  InkeepEmbeddedChat,
  InkeepEmbeddedChatProps,
  InkeepEmbeddedSearchAndChat,
  InkeepEmbeddedSearchAndChatProps,
  type SearchFunctions,
} from '@inkeep/cxkit-react';
import { useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/primitives/dialog';
import { ScrollArea } from '@/components/primitives/scroll-area';

type InkeepSearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  organizationId?: string;
  integrationId?: string;
  initialQuery?: string;
};

export function InkeepSearchModal({ isOpen, onClose, apiKey, initialQuery }: InkeepSearchModalProps) {
  const searchFunctionsRef = useRef<SearchFunctions>(null);
  const chatFunctionsRef = useRef<AIChatFunctions>(null);

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

  // Focus the input and set initial query when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the component is mounted
      setTimeout(() => {
        // Focus the chat input since we're defaulting to chat view
        chatFunctionsRef.current?.focusInput();

        // Set the initial query in the chat input if provided
        if (initialQuery?.trim()) {
          chatFunctionsRef.current?.updateInputMessage(initialQuery);
        }
      }, 100);
    }
  }, [isOpen, initialQuery]);

  const inkeepConfig: InkeepEmbeddedChatProps = {
    baseSettings: {
      apiKey,
      organizationDisplayName: 'Novu',
      primaryBrandColor: '#DD2476',
      theme: {
        styles: [
          {
            key: 'custom-theme',
            type: 'style',
            value: `
              .ikp-ai-chat-wrapper {
                margin: 0;
                width: 100%;
                box-shadow: none;
                height: 100%;
                overflow: hidden;
              }

              .ikp-ai-chat-content {
                overflow: auto !important;
              }

              .ikp-ai-chat-content-scroll-area {
                overflow: auto !important;
              }
            `,
          },
        ],
      },
    },
    aiChatSettings: {
      aiAssistantName: 'Novu AI',
      chatFunctionsRef,
    },
    shouldAutoFocusInput: true,
  };

  return (
    <div className="h-[550px] overflow-auto">
      <InkeepEmbeddedChat {...inkeepConfig} />
    </div>
  );
}
