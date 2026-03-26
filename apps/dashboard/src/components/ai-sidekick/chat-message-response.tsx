import { cn } from '@/utils/ui';
import { MessageContent, MessageResponse } from '../ai-elements/message';

export const StyledMessageResponse = ({ children, className }: { children: string; className?: string }) => {
  return (
    <MessageContent
      className={cn(
        '[&>.target-anchor]:text-label-xs [&>.target-anchor]:text-text-soft [&>.target-anchor_p,ol,ul]:mb-2 [&>.target-anchor_h1,h2,h3,h4,h5,h6]:mt-4 [&>.target-anchor_h1]:text-2xl [&>.target-anchor_h2]:text-xl [&>.target-anchor_h3]:text-lg [&>.target-anchor_code]:text-label-xs [&>.target-anchor_code]:text-text-soft [&>.target-anchor_ol]:list-[revert] [&>.target-anchor_ul]:list-[revert] [&>.target-anchor_menu]:list-[revert]',
        className
      )}
    >
      <MessageResponse>{children}</MessageResponse>
    </MessageContent>
  );
};
