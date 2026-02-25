import { MessageContent, MessageResponse } from '../ai-elements/message';

export const StyledMessageResponse = ({ children }: { children: string }) => {
  return (
    <MessageContent className="[&>.target-anchor]:text-label-xs [&>.target-anchor]:text-text-sub [&>.target-anchor_p,ol,ul]:mb-2 [&>.target-anchor_h1,h2,h3,h4,h5,h6]:mt-4 [&>.target-anchor_h1]:text-2xl [&>.target-anchor_h2]:text-xl [&>.target-anchor_h3]:text-lg [&>.target-anchor_code]:text-label-xs [&>.target-anchor_code]:text-text-sub">
      <MessageResponse>{children}</MessageResponse>
    </MessageContent>
  );
};
