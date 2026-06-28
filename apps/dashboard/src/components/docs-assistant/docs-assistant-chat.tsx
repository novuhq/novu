import type { SourceUrlUIPart, UIMessage } from 'ai';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { RiCloseLine, RiSparklingLine } from 'react-icons/ri';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { CompactButton } from '@/components/primitives/button-compact';
import { StyledMessageResponse } from '@/components/ai-sidekick/chat-message-response';
import { useMintlifyAssistant } from '@/hooks/use-mintlify-assistant';
import { docsUrl } from '@/components/header-navigation/support-drawer-constants';

type DocsAssistantChatProps = {
  initialQuery?: string;
  onClose: () => void;
};

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

function getMessageSources(message: UIMessage): SourceUrlUIPart[] {
  return message.parts.filter((part): part is SourceUrlUIPart => part.type === 'source-url');
}

export function DocsAssistantChat({ initialQuery, onClose }: DocsAssistantChatProps) {
  const [input, setInput] = useState('');
  const initialQuerySentRef = useRef(false);
  const { messages, sendPrompt, isGenerating, isReady, error } = useMintlifyAssistant();

  useEffect(() => {
    if (!initialQuery?.trim() || initialQuerySentRef.current) {
      return;
    }

    initialQuerySentRef.current = true;
    sendPrompt(initialQuery);
  }, [initialQuery, sendPrompt]);

  function handleSubmit(_message: PromptInputMessage, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!input.trim() || isGenerating) {
      return;
    }

    const prompt = input.trim();
    setInput('');
    sendPrompt(prompt);
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="border-stroke-soft flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <RiSparklingLine className="text-primary-base size-4" />
          <span className="text-foreground-950 text-sm font-medium">Novu AI</span>
        </div>
        <CompactButton
          variant="ghost"
          size="sm"
          icon={RiCloseLine}
          onClick={onClose}
          aria-label="Close assistant"
        />
      </div>

      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-4 px-4 py-4">
          {messages.length === 0 && !isGenerating && (
            <div className="text-text-soft flex flex-col gap-2 px-1 py-6">
              <span className="text-label-md text-text-sub">Ask about Novu docs</span>
              <span className="text-paragraph-sm">
                Get answers grounded in our documentation with source links.
              </span>
            </div>
          )}

          {messages.map((message) => {
            const text = getMessageText(message);
            const sources = getMessageSources(message);

            if (!text && sources.length === 0) {
              return null;
            }

            return (
              <Message key={message.id} from={message.role}>
                {message.role === 'user' ? (
                  <MessageContent>{text}</MessageContent>
                ) : (
                  <div className="flex flex-col gap-2">
                    {text ? <StyledMessageResponse>{text}</StyledMessageResponse> : null}
                    {sources.length > 0 && (
                      <div className="flex flex-col gap-1 px-1">
                        <span className="text-label-xs text-text-soft">Sources</span>
                        {sources.map((source) => {
                          const href = source.url?.startsWith('http') ? source.url : docsUrl(source.url ?? '');

                          return (
                            <a
                              key={source.sourceId ?? href}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-label-xs text-primary-base hover:underline truncate"
                            >
                              {source.title ?? source.url}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Message>
            );
          })}

          {isGenerating && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Thinking…</Shimmer>
              </MessageContent>
            </Message>
          )}

          {error && (
            <div className="text-destructive text-paragraph-sm px-1">
              Something went wrong. Please try again.
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-stroke-soft shrink-0 border-t p-3">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask a question about Novu…"
              disabled={!isReady && isGenerating}
              autoFocus
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit disabled={!input.trim() || isGenerating} status={isGenerating ? 'streaming' : 'ready'} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
