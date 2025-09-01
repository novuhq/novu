import { motion } from 'motion/react';
import { useState } from 'react';
import { RiCheckLine, RiSparklingLine } from 'react-icons/ri';

import { IS_EU } from '@/config';
import { useTelemetry } from '../../hooks/use-telemetry';
import { TelemetryEvent } from '../../utils/telemetry';
import { InlineToast } from '../primitives/inline-toast';
import { FRAMEWORK_CONFIGS, getFrameworkPrompt } from './ai-prompts/ai-prompts';

interface AiPromptsSectionProps {
  className?: string;
  frameworkName: string;
  applicationIdentifier?: string;
  subscriberId?: string;
  backendUrl?: string;
  socketUrl?: string;
  codeSnippet?: string;
}

export function AiPromptsSection({
  className,
  frameworkName,
  applicationIdentifier,
  subscriberId,
  backendUrl,
  socketUrl,
  codeSnippet,
}: AiPromptsSectionProps) {
  const track = useTelemetry();
  const [isCopied, setIsCopied] = useState(false);

  // Only applicationIdentifier and subscriberId are truly required
  if (!applicationIdentifier || !subscriberId) {
    return null;
  }

  const prompt = getFrameworkPrompt(
    frameworkName,
    IS_EU,
    applicationIdentifier,
    subscriberId,
    backendUrl,
    socketUrl,
    codeSnippet
  );

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      track(TelemetryEvent.AI_PROMPT_COPIED, {
        framework: frameworkName,
        promptType: 'integration-help',
      });
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setIsCopied(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={className}
    >
      <InlineToast
        variant="tip"
        className="w-fit"
        description={
          <div className="flex items-center gap-3">
            <span>
              Copy this quick-start guide as a prompt for LLMs to implement Novu in{' '}
              {FRAMEWORK_CONFIGS[frameworkName]?.name.split(' ')[0]} application.
            </span>
            <button
              onClick={handleCopyPrompt}
              className="inline-flex select-none items-center justify-center gap-2 whitespace-nowrap h-8 px-3 outline-none text-label-xs font-medium transition-all duration-300 ease-out bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <motion.div
                key={isCopied ? 'copied' : 'copy'}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex items-center gap-2"
              >
                {isCopied ? (
                  <>
                    <RiCheckLine className="size-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <RiSparklingLine className="size-4" />
                    <span>Copy Prompt</span>
                  </>
                )}
              </motion.div>
            </button>
          </div>
        }
      />
    </motion.div>
  );
}
