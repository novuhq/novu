import { motion } from 'motion/react';
import { useState } from 'react';
import { Button } from '@/components/primitives/button';

import { useTelemetry } from '../../hooks/use-telemetry';
import { TelemetryEvent } from '../../utils/telemetry';
import { InlineToast } from '../primitives/inline-toast';
import { FRAMEWORK_CONFIGS } from './ai-prompts/simple-framework-configs';
import { getFrameworkPrompt } from './ai-prompts/simple-prompt-getter';

interface AiPromptsSectionProps {
  className?: string;
  frameworkName: string;
  applicationIdentifier?: string;
  subscriberId?: string;
}

export function AiPromptsSection({
  className,
  frameworkName,
  applicationIdentifier,
  subscriberId,
}: AiPromptsSectionProps) {
  const track = useTelemetry();
  const [isCopied, setIsCopied] = useState(false);

  // Only show for Next.js and React
  if (frameworkName !== 'Next.js' && frameworkName !== 'React') {
    return null;
  }

  const prompt = getFrameworkPrompt(frameworkName, applicationIdentifier, 'us', subscriberId);

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
              {FRAMEWORK_CONFIGS[frameworkName]?.name?.split(' ')[0] ?? frameworkName ?? 'Framework'} application.
            </span>
            <Button onClick={handleCopyPrompt} variant="secondary" mode="outline" size="xs">
              <div className="grid place-items-center">
                <div
                  className={`col-start-1 row-start-1 flex items-center ${isCopied ? 'opacity-0' : 'opacity-100'}`}
                  aria-hidden={isCopied}
                >
                  <span>Copy</span>
                </div>
                <div
                  className={`col-start-1 row-start-1 flex items-center ${isCopied ? 'opacity-100' : 'opacity-0'}`}
                  aria-hidden={!isCopied}
                >
                  <span>Copied</span>
                </div>
              </div>
            </Button>
          </div>
        }
      />
    </motion.div>
  );
}
