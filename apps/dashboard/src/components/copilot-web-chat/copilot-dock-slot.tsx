import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { COPILOT_PANEL_WIDTH } from './copilot-panel-layout';
import { registerCopilotDockSlot, useCopilotDockShown } from './copilot-panel-store';
import { COPILOT_DOCK_TRANSITION } from './copilot-web-chat-utils';

/**
 * The room a docked Copilot takes beside the page, under the top bar, so the page reflows instead of being covered.
 * Rendered by the page layouts; it stays 0px wide until the Copilot docks, and the panel itself is drawn over it.
 */
export function CopilotDockSlot() {
  const ref = useRef<HTMLDivElement>(null);
  const isDockShown = useCopilotDockShown();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const { measure, unregister } = registerCopilotDockSlot(element);
    // A banner above the top bar moves the slot down and shortens it, so a resize covers every move.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      unregister();
    };
  }, []);

  return (
    <motion.div
      ref={ref}
      aria-hidden
      initial={false}
      animate={{ width: isDockShown ? COPILOT_PANEL_WIDTH : 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : COPILOT_DOCK_TRANSITION}
      className="shrink-0"
    />
  );
}
