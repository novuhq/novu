import { RiAlertFill } from 'react-icons/ri';

/**
 * Full-width warning band shown above the chat preview when the selected provider has no integration
 * (or on the provider-agnostic default preview). Matches Figma `10980:12895`/`10980:12896`: a
 * warning-tinted band bordered top and bottom, a `warning-fill` icon, warning-dark text, and an
 * inline "Connect ..." call to action.
 */
type PreviewWarningBannerProps = {
  message: string;
  ctaLabel: string;
  onConnect: () => void;
};

export function PreviewWarningBanner({ message, ctaLabel, onConnect }: PreviewWarningBannerProps) {
  return (
    <div className="border-stroke-soft bg-warning/10 flex w-full items-start gap-0.5 border-y px-1.5 py-1.75">
      <span className="flex size-4 shrink-0 items-center justify-center">
        <RiAlertFill className="text-warning min-w-2.5 size-2.5" />
      </span>
      <p className="flex flex-wrap items-center gap-1 text-[12px] font-medium leading-4 text-[#682f12]">
        <span>{message}</span>
        <button type="button" onClick={onConnect} className="underline-offset-2 hover:underline">
          {ctaLabel}
        </button>
      </p>
    </div>
  );
}
