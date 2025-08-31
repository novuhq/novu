import { motion } from 'motion/react';
import { useState } from 'react';
import { RiCheckLine, RiSparklingLine } from 'react-icons/ri';
import { IS_EU } from '@/config';
import { useTelemetry } from '../../hooks/use-telemetry';
import { TelemetryEvent } from '../../utils/telemetry';
import { ToastIcon } from '../primitives/sonner';
import { showToast } from '../primitives/sonner-helpers';
import { getFrameworkPrompt } from './ai-prompts';

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

  let prompt: string;
  try {
    prompt = getFrameworkPrompt(
      frameworkName,
      IS_EU,
      applicationIdentifier,
      subscriberId,
      backendUrl,
      socketUrl,
      codeSnippet
    );
  } catch (error) {
    // If required parameters are missing, show a helpful message
    if (error instanceof Error && error.message.includes('Missing required environment variables')) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={className}
        >
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg w-full max-w-[57.8125rem] transition-all duration-200 shadow-sm mb-3">
            <div className="flex-1">
              <p className="text-sm text-amber-800">
                Please provide all required environment variables (application identifier, subscriber ID, backend URL,
                and socket URL) to generate the AI prompt.
              </p>
            </div>
          </div>
        </motion.div>
      );
    }

    // For other errors, re-throw them
    throw error;
  }

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      track(TelemetryEvent.AI_PROMPT_COPIED, {
        framework: frameworkName,
        promptType: 'integration-help',
      });
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      showToast({
        children: () => (
          <>
            <ToastIcon variant="success" />
            <span className="text-sm">AI prompt copied to clipboard!</span>
          </>
        ),
        options: {
          position: 'bottom-center',
          style: {
            left: '50%',
            transform: 'translateX(-50%)',
            minWidth: '280px',
          },
        },
      });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      showToast({
        children: () => (
          <>
            <ToastIcon variant="error" />
            <span className="text-sm">Failed to copy prompt</span>
          </>
        ),
        options: {
          position: 'bottom-center',
          style: {
            left: '50%',
            transform: 'translateX(-50%)',
            minWidth: '280px',
          },
        },
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={className}
    >
      <div className="flex items-center gap-3 p-4 bg-neutral-100 rounded-lg w-full max-w-[57.8125rem] transition-all duration-200 shadow-sm mb-3">
        <div className="flex-1">
          <p className="text-sm text-[#0E121B]">Use this pre-built prompt to get started faster.</p>
        </div>
        <button
          onClick={handleCopyPrompt}
          className="inline-flex select-none items-center justify-center gap-2 whitespace-nowrap h-9 px-3 outline-none text-sm font-medium transition-all duration-300 ease-out bg-gradient-to-r from-[#dd2476] to-[#ff512f] text-white shadow-sm rounded-lg hover:shadow-md w-32 overflow-hidden"
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
                <RiCheckLine className="size-4 text-white" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <RiSparklingLine className="w-4 h-4 text-white" />
                <span>Copy Prompt</span>
              </>
            )}
          </motion.div>
        </button>
      </div>
    </motion.div>
  );
}
