import { motion } from 'motion/react';
import { useState } from 'react';
import { RiCheckLine, RiSparklingLine } from 'react-icons/ri';

import { useTelemetry } from '../../hooks/use-telemetry';
import { TelemetryEvent } from '../../utils/telemetry';
import { InlineToast } from '../primitives/inline-toast';
import { FRAMEWORK_CONFIGS } from './ai-prompts/simple-framework-configs';
import { getFrameworkPrompt } from './ai-prompts/simple-prompt-getter';

interface AiPromptsSectionProps {
  className?: string;
  frameworkName: string;
}

export function AiPromptsSection({ className, frameworkName }: AiPromptsSectionProps) {
  const track = useTelemetry();
  const [isCopied, setIsCopied] = useState(false);

  const prompt = getFrameworkPrompt(frameworkName);

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
