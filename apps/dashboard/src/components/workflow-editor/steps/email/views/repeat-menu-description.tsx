import { useEffect, useState } from 'react';
import { Editor } from '@tiptap/react';
import { AnimatePresence, motion } from 'motion/react';
import { Lightbulb } from 'lucide-react';
import { Separator } from '@/components/primitives/separator';
import { REPEAT_BLOCK_ITERABLE_ALIAS } from '../variables/variables';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { FeatureFlagsKeysEnum } from '@novu/shared';

export function RepeatMenuDescription({ editor }: { editor: Editor }) {
  const [currentProperty, setCurrentProperty] = useState('\u00A0}}');
  const isEnhancedDigestEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_ENHANCED_DIGEST_ENABLED);

  function isOnEmptyLine(editor: Editor, cursorPos: number) {
    const currentLineContent = editor.state.doc
      .textBetween(
        Math.max(0, editor.state.doc.resolve(cursorPos).start()),
        Math.min(editor.state.doc.content.size, editor.state.doc.resolve(cursorPos).end())
      )
      .trim();

    return currentLineContent === '';
  }

  useEffect(() => {
    const properties = ['\u00A0}}', '.foo }}', '.bar }}', '.attr }}'];
    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % properties.length;
      setCurrentProperty(properties[currentIndex]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const shouldShow = isOnEmptyLine(editor, editor.state.selection.from);

  const iterableKey = isEnhancedDigestEnabled ? REPEAT_BLOCK_ITERABLE_ALIAS : editor.getAttributes('repeat')?.each;

  return (
    <AnimatePresence mode="wait">
      {shouldShow && (
        <motion.div
          key="repeat-menu"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="mly-shadow-sm mly-text-gray-400 overflow-hidden text-xs"
        >
          <Separator className="mt-0.5" />
          <div className="flex items-start gap-1 px-1 py-1.5">
            <Lightbulb className="mt-0.5 size-3.5 stroke-[2] text-gray-400" />
            <div>
              <div>Access each 'repeat' key via</div>
              <span>
                <code className="mly-py-0.5 mly-bg-gray-50 mly-rounded mly-font-mono mly-text-gray-400">
                  {`{{ ${iterableKey}`}
                  <span className="inline-block pr-1">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={currentProperty}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="inline-block"
                      >
                        {currentProperty}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </code>
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
