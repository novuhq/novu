import { MessageContent, MessageResponse } from '../ai-elements/message';

export const StyledMessageResponse = ({ children }: { children: string }) => {
  return (
    <MessageContent className="[&>.target-anchor]:text-label-xs [&>.target-anchor]:text-text-sub [&>.target-anchor_p,ol,ul]:mb-2">
      <MessageResponse>{children}</MessageResponse>
    </MessageContent>
  );
};
