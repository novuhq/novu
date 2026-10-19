import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { ConversationDetail } from './conversation-detail';

type ConversationDetailSheetProps = {
  conversationId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ConversationDetailSheet({ conversationId, isOpen, onOpenChange }: ConversationDetailSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        className="bg-bg-weak flex w-full flex-col gap-0 p-0 sm:max-w-[640px] [&_[data-close-button]]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <SheetTitle>Conversation details</SheetTitle>
          <SheetDescription>Details and timeline for the selected conversation.</SheetDescription>
        </VisuallyHidden>
        {conversationId ? (
          <ConversationDetail conversationId={conversationId} onClose={() => onOpenChange(false)} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
