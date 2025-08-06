import type { IEnvironment } from '@novu/shared';
import { RiArrowRightSLine, RiCheckboxCircleFill, RiCloseFill } from 'react-icons/ri';
import type { IEnvironmentPublishResponse } from '@/api/environments';
import { useEnvironment } from '@/context/environment/hooks';
import { Button } from '../primitives/button';
import { Dialog, DialogClose, DialogContent } from '../primitives/dialog';

type PublishSuccessModalProps = {
  isOpen: boolean;
  onClose: () => void;
  environment: IEnvironment | null;
  publishResult?: IEnvironmentPublishResponse;
  onSwitchEnvironment?: () => void;
};

export function PublishSuccessModal({
  isOpen,
  onClose,
  environment,
  publishResult,
  onSwitchEnvironment,
}: PublishSuccessModalProps) {
  const { currentEnvironment } = useEnvironment();

  const workflowCount = publishResult?.results?.find((r) => r.resourceType === 'workflow')?.successful?.length || 0;
  const layoutCount = publishResult?.results?.find((r) => r.resourceType === 'layout')?.successful?.length || 0;
  const translationCount =
    publishResult?.results?.find((r) => r.resourceType === 'translation')?.successful?.length || 0;

  const buildSummaryText = () => {
    const parts: string[] = [];

    if (workflowCount > 0) {
      parts.push(`${workflowCount} workflow${workflowCount !== 1 ? 's' : ''}`);
    }

    if (layoutCount > 0) {
      parts.push(`${layoutCount} layout${layoutCount !== 1 ? 's' : ''}`);
    }

    if (translationCount > 0) {
      parts.push(`${translationCount} shared component${translationCount !== 1 ? 's' : ''}`);
    }

    if (parts.length === 0) return 'No items';
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;

    return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm gap-4 p-4">
        <div className="flex items-start justify-between">
          <div className="bg-success-lighter rounded-full p-2">
            <RiCheckboxCircleFill className="text-success-base size-6" />
          </div>
          <DialogClose asChild>
            <button className="opacity-70 transition-opacity hover:opacity-100">
              <RiCloseFill className="size-4" />
            </button>
          </DialogClose>
        </div>

        <div className="space-y-2">
          <h2 className="text-label-sm text-text-strong font-medium">Environment Published to {environment?.name}</h2>
          <p className="text-paragraph-xs text-text-soft">
            <span className="text-text-sub font-medium">{buildSummaryText()}</span> in{' '}
            <span className="text-text-sub font-medium">{currentEnvironment?.name?.toLowerCase()}</span> have been
            Published to {environment?.name}.
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            variant="secondary"
            mode="filled"
            size="2xs"
            onClick={onSwitchEnvironment}
            trailingIcon={RiArrowRightSLine}
          >
            Switch to {environment?.name}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
