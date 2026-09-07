import { RiInformation2Line } from 'react-icons/ri';
import { Hint, HintIcon } from '@/components/primitives/hint';
import { buildSlackBlockKitBuilderUrl } from './slack-block-kit-builder-url';

type SlackBlockKitBuilderHintProps = {
  override?: Record<string, unknown>;
};

export function SlackBlockKitBuilderHint({ override }: SlackBlockKitBuilderHintProps) {
  const href = buildSlackBlockKitBuilderUrl(override);

  return (
    <Hint className="text-label-xs">
      <HintIcon as={RiInformation2Line} aria-hidden />
      <span className="min-w-0 flex-1">
        Design and preview your message using Slack&apos;s native block editor.{' '}
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-text-strong whitespace-nowrap">
          Open builder ↗
        </a>
      </span>
    </Hint>
  );
}
