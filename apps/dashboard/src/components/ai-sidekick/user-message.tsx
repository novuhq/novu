import { UIMessage } from 'ai';
import { useMemo } from 'react';
import { RiArrowGoBackLine } from 'react-icons/ri';
import { Message } from '../ai-elements/message';
import { RefreshIcon } from '../icons/refresh';
import { Button } from '../primitives/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip';

function extractMessageContent(message: UIMessage): string {
  let text = '';

  for (const part of message.parts) {
    if (part.type === 'text' && part.text) {
      text += part.text;
    }
  }

  return text;
}

export const UserMessage = ({
  message,
  onRevert,
  onTryAgain,
  isGenerating,
  isActionPending,
}: {
  message: UIMessage;
  onRevert: (messageId: string) => void;
  onTryAgain: (messageId: string) => void;
  isGenerating?: boolean;
  isActionPending?: boolean;
}) => {
  const text = useMemo(() => extractMessageContent(message), [message]);

  return (
    <Message from={message.role} key={message.id}>
      {message.role === 'user' && (
        <div className="flex justify-end gap-1 -mb-1">
          <Tooltip delayDuration={2000}>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                mode="ghost"
                size="2xs"
                className="p-1 h-auto hover:bg-transparent [&:disabled:not(.loading)]:bg-transparent [&>svg]:size-3"
                onClick={() => onRevert(message.id)}
                disabled={isGenerating || isActionPending}
                trailingIcon={RiArrowGoBackLine}
                aria-label="Revert"
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Revert</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={2000}>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                mode="ghost"
                size="2xs"
                className="p-1 h-auto hover:bg-transparent [&:disabled:not(.loading)]:bg-transparent [&>svg]:size-3"
                onClick={() => onTryAgain(message.id)}
                disabled={isGenerating || isActionPending}
                trailingIcon={RefreshIcon}
                aria-label="Try again"
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Try again</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
      <div className="flex justify-end bg-[#F1F1F1] rounded-lg p-2 max-w-full self-end">
        <span className="text-label-xs text-text-sub">{text}</span>
      </div>
    </Message>
  );
};
