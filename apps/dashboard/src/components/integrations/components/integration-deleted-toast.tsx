import type { IIntegration } from '@novu/shared';
import { RiDeleteBin2Line } from 'react-icons/ri';
import { ToastClose } from '@/components/primitives/sonner';
import { showToast } from '@/components/primitives/sonner-helpers';
import { ToastProgress } from './toast-progress';
import { CHANNEL_LABELS } from './utils/helpers';

const TOAST_DURATION_MS = 6_000;

/** Confirms a delete, and names the integration that took over as primary when there is one. */
export function showIntegrationDeletedToast({
  integration,
  newPrimary,
}: {
  integration: IIntegration;
  newPrimary?: IIntegration;
}) {
  const label = integration.channel ? CHANNEL_LABELS[integration.channel] : undefined;
  const noun = label && label !== label.toUpperCase() ? label.toLowerCase() : label;
  const description =
    newPrimary && noun
      ? `${newPrimary.name} is now your primary ${noun} provider.`
      : 'Other environments keep their own setup.';

  showToast({
    variant: 'lg',
    className: 'relative w-[380px] max-w-[calc(100vw-2rem)] gap-2.5 overflow-hidden',
    children: ({ close }) => (
      <>
        <RiDeleteBin2Line className="text-text-strong mt-0.5 size-5 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-label-sm text-text-strong truncate">{integration.name} deleted</span>
          <span className="text-paragraph-xs text-text-sub">{description}</span>
        </div>
        <ToastClose className="text-text-soft shrink-0" onClick={close} />
        <ToastProgress durationMs={TOAST_DURATION_MS} />
      </>
    ),
    options: { duration: TOAST_DURATION_MS, position: 'bottom-right' },
  });
}
