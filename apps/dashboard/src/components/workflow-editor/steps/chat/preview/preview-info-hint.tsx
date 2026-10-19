import { RiInformation2Line } from 'react-icons/ri';

/**
 * Static hint under the chat preview clarifying it is an approximation. Matches Figma `10980:12903`:
 * `information-2-line` icon with `text-sub` copy, no background.
 */
export function PreviewInfoHint() {
  return (
    <div className="flex items-start gap-0.5 pt-0.5 pb-6">
      <RiInformation2Line className="text-text-sub size-4 shrink-0" />
      <p className="text-text-sub text-[12px] font-normal leading-4">
        This preview shows how your message will appear. Actual rendering may vary by provider.
      </p>
    </div>
  );
}
