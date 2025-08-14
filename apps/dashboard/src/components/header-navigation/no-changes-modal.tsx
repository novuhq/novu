import type { IEnvironment } from '@novu/shared';
import { Button } from '../primitives/button';
import { Dialog, DialogContent } from '../primitives/dialog';

type NoChangesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  targetEnvironment?: IEnvironment;
};

export function NoChangesModal({ isOpen, onClose }: NoChangesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md gap-4 p-3">
        <div className="flex items-start justify-start">
          <svg width="116" height="44" viewBox="0 0 116 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.5" y="0.5" width="115" height="43" rx="7.5" stroke="#E1E4EA" strokeDasharray="5 3" />
            <rect x="2.5" y="2.5" width="111" height="39" rx="5.5" fill="white" />
            <rect x="2.5" y="2.5" width="111" height="39" rx="5.5" stroke="#F2F5F8" />
            <rect x="10.5" y="10.5" width="23" height="23" rx="5.5" fill="#FF8447" fillOpacity="0.1" />
            <rect x="10.5" y="10.5" width="23" height="23" rx="5.5" stroke="#FF8447" />
            <path
              d="M21.4 22.0001L17.1574 26.2427L16.309 25.3943L19.7032 22.0001L16.309 18.6059L17.1574 17.7581L21.4 22.0001ZM21.4 26.2001H27.4V27.4001H21.4V26.2001Z"
              fill="#FF8447"
            />
            <path
              d="M58 16.5L62.75 19.25V24.75L58 27.5L53.25 24.75V19.25L58 16.5ZM54.7469 19.5389L58.0001 21.4222L61.2531 19.5389L58 17.6555L54.7469 19.5389ZM54.25 20.4066V24.1735L57.5001 26.055V22.2882L54.25 20.4066ZM58.5001 26.055L61.75 24.1735V20.4067L58.5001 22.2882V26.055Z"
              fill="#E1E4EA"
            />
            <path d="M37 22H47" stroke="#F2F5F8" strokeLinecap="round" strokeLinejoin="bevel" />
            <rect x="82.5" y="10.5" width="23" height="23" rx="5.5" fill="#7D52F4" fillOpacity="0.1" />
            <rect x="82.5" y="10.5" width="23" height="23" rx="5.5" stroke="#7D52F4" />
            <path
              d="M93.4 22.0001L89.1574 26.2427L88.309 25.3943L91.7032 22.0001L88.309 18.6059L89.1574 17.7581L93.4 22.0001ZM93.4 26.2001H99.4V27.4001H93.4V26.2001Z"
              fill="#7D52F4"
            />
          </svg>
        </div>

        <div className="">
          <h2 className="text-label-sm text-text-sub">No changes to publish</h2>
          <p className="text-text-soft text-paragraph-xs mt-1">
            You're all caught up! There are no workflows or layouts pending for publishing right now.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button onClick={onClose} variant="primary" size="2xs">
            Alright
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
