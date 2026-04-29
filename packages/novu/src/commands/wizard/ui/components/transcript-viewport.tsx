import { Box, useStdout } from 'ink';
import { ScrollView, type ScrollViewRef } from 'ink-scroll-view';
import React from 'react';
import { applyScrollAction, type ScrollAction } from '../hooks/use-scroll-keys';

export type { ScrollAction };

export interface TranscriptViewportHandle {
  scroll: (action: ScrollAction) => void;
  isAtBottom: () => boolean;
  /**
   * Number of new lines below the visible viewport (0 when scrolled to bottom).
   */
  getLinesBelow: () => number;
}

interface TranscriptViewportProps {
  /**
   * The dependency tokens that, when they change, may cause new content to
   * appear at the bottom. We use them to trigger auto-stick to bottom.
   */
  contentToken: unknown;
  children: React.ReactNode;
}

export const TranscriptViewport = React.forwardRef<TranscriptViewportHandle, TranscriptViewportProps>(
  function TranscriptViewport({ contentToken, children }, forwardedRef): React.ReactElement {
    const scrollRef = React.useRef<ScrollViewRef>(null);
    const { stdout } = useStdout();
    const userScrolledRef = React.useRef(false);
    const [linesBelow, setLinesBelow] = React.useState(0);

    React.useEffect(() => {
      const handler = () => {
        scrollRef.current?.remeasure();
      };
      stdout?.on('resize', handler);

      return () => {
        stdout?.off('resize', handler);
      };
    }, [stdout]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: contentToken is the trigger for auto-stick to bottom
    React.useEffect(() => {
      if (userScrolledRef.current) {
        const ref = scrollRef.current;
        if (!ref) return;
        const offset = ref.getScrollOffset();
        const bottom = ref.getBottomOffset();
        setLinesBelow(Math.max(0, bottom - offset));

        return;
      }
      const id = setTimeout(() => {
        scrollRef.current?.scrollToBottom();
        setLinesBelow(0);
      }, 0);

      return () => clearTimeout(id);
    }, [contentToken]);

    const handleScroll = React.useCallback((offset: number) => {
      const ref = scrollRef.current;
      if (!ref) return;
      const bottom = ref.getBottomOffset();
      const delta = bottom - offset;
      setLinesBelow(Math.max(0, delta));
      userScrolledRef.current = delta > 1;
    }, []);

    React.useImperativeHandle(
      forwardedRef,
      () => ({
        scroll(action) {
          applyScrollAction(scrollRef.current, action);
          if (action === 'top') {
            userScrolledRef.current = true;
          } else if (action === 'bottom') {
            userScrolledRef.current = false;
            setLinesBelow(0);
          }
        },
        isAtBottom: () => !userScrolledRef.current,
        getLinesBelow: () => linesBelow,
      }),
      [linesBelow]
    );

    return (
      <Box flexDirection="column" flexGrow={1} flexShrink={1} minHeight={0} overflow="hidden" width="100%">
        <ScrollView ref={scrollRef} onScroll={handleScroll} flexDirection="column" width="100%">
          {children}
        </ScrollView>
      </Box>
    );
  }
);
