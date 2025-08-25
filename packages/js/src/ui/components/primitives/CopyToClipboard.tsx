import { createSignal, JSX } from 'solid-js';
import { useStyle } from '../../helpers';
import { Tooltip } from './Tooltip';

type CopyToClipboardProps = {
  textToCopy: string;
  children: JSX.Element;
  tooltipText?: string;
  tooltipDuration?: number;
};

export function CopyToClipboard(props: CopyToClipboardProps) {
  const [isCopied, setIsCopied] = createSignal(false);
  const style = useStyle();
  let timeoutId: number | undefined;

  const defaultTooltipText = 'Copied!';
  const defaultTooltipDuration = 2000;

  async function handleCopy() {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    try {
      await navigator.clipboard.writeText(props.textToCopy);
      setIsCopied(true);
      timeoutId = window.setTimeout(() => {
        setIsCopied(false);
        timeoutId = undefined;
      }, props.tooltipDuration ?? defaultTooltipDuration);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }

  return (
    <Tooltip.Root open={isCopied()} placement="top" animationDuration={0.15}>
      <Tooltip.Trigger
        asChild={(triggerProps) => (
          <button
            type="button"
            {...triggerProps}
            onClick={handleCopy}
            class={style({ key: 'button', className: 'nt-cursor-pointer' })}
          >
            {props.children}
          </button>
        )}
      />
      <Tooltip.Content>{props.tooltipText ?? defaultTooltipText}</Tooltip.Content>
    </Tooltip.Root>
  );
}
