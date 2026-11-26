import { type MotionValue, useMotionValue } from 'motion/react';
import { type PointerEvent, type RefObject, useEffect, useRef, useState } from 'react';
import {
  COPILOT_FLOATING_GAP,
  type CopilotPanelLayout,
  clampCopilotFloatingPosition,
  getCopilotFloatingHeight,
  isInCopilotDockZone,
} from './copilot-panel-layout';
import { setCopilotPanelLayout } from './copilot-panel-store';

// A press that moves less than this is a click on the header, not a drag.
const DRAG_THRESHOLD_PX = 4;
const IDLE = { isDragging: false, isOverDockZone: false };

type Gesture = {
  pointerId: number;
  startX: number;
  startY: number;
  /** Where the pointer holds the panel, from its top-left corner, so the panel does not jump to the pointer. */
  grabX: number;
  grabY: number;
  isDragging: boolean;
  isOverDockZone: boolean;
};

export type CopilotPanelDragHandleProps = {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
};

export type CopilotPanelDrag = {
  isDragging: boolean;
  /** The pointer is over the right edge, where dropping docks the panel. */
  isOverDockZone: boolean;
  /** The dragged panel's top-left corner; only meaningful while `isDragging`. */
  left: MotionValue<number>;
  top: MotionValue<number>;
  handleProps: CopilotPanelDragHandleProps;
};

/**
 * Drags the panel by its header: a docked panel floats as soon as it moves, a floating one follows the pointer under
 * the top bar, and dropping it on the right edge docks it again. The pointer only moves motion values, so the thread
 * does not re-render while the panel moves.
 */
export function useCopilotPanelDrag({
  panelRef,
  layout,
  canDock,
  topLimit,
  isShown,
}: {
  panelRef: RefObject<HTMLElement | null>;
  layout: CopilotPanelLayout;
  canDock: boolean;
  topLimit: number;
  /** A panel closed mid-drag (Escape, Cmd+J) takes its header away before the pointer is released. */
  isShown: boolean;
}): CopilotPanelDrag {
  const gestureRef = useRef<Gesture | undefined>(undefined);
  const [state, setState] = useState(IDLE);
  const left = useMotionValue(0);
  const top = useMotionValue(0);

  useEffect(() => {
    if (isShown) return;

    gestureRef.current = undefined;
    setState(IDLE);
  }, [isShown]);

  const finish = (event: PointerEvent<HTMLElement>, canDrop: boolean) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    gestureRef.current = undefined;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (!gesture.isDragging) return;

    // Docking keeps the last floating position, so undocking puts the panel back where it was.
    setCopilotPanelLayout(
      canDrop && gesture.isOverDockZone
        ? { ...layout, mode: 'docked' }
        : { mode: 'floating', position: { left: left.get(), top: top.get() } }
    );
    setState(IDLE);
  };

  return {
    ...state,
    left,
    top,
    handleProps: {
      onPointerDown: (event) => {
        if (event.button !== 0 || !event.isPrimary) return;
        if (event.target instanceof Element && event.target.closest('button')) return;

        const rect = panelRef.current?.getBoundingClientRect();
        if (!rect) return;

        gestureRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          grabX: event.clientX - rect.left,
          grabY: event.clientY - rect.top,
          isDragging: false,
          isOverDockZone: false,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove: (event) => {
        const gesture = gestureRef.current;
        if (!gesture || gesture.pointerId !== event.pointerId) return;

        const wasDragging = gesture.isDragging;
        if (
          !wasDragging &&
          Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) < DRAG_THRESHOLD_PX
        ) {
          return;
        }

        const viewport = { width: window.innerWidth, height: window.innerHeight };
        const height = getCopilotFloatingHeight({
          viewportHeight: viewport.height,
          topLimit,
          bottomGap: COPILOT_FLOATING_GAP,
        });
        const position = clampCopilotFloatingPosition(
          { left: event.clientX - gesture.grabX, top: event.clientY - gesture.grabY },
          { viewport, height, topLimit }
        );
        left.set(position.left);
        top.set(position.top);

        const isOverDockZone = canDock && isInCopilotDockZone(event.clientX, viewport.width);
        if (wasDragging && isOverDockZone === gesture.isOverDockZone) return;

        gesture.isDragging = true;
        gesture.isOverDockZone = isOverDockZone;
        setState({ isDragging: true, isOverDockZone });
      },
      onPointerUp: (event) => finish(event, true),
      onPointerCancel: (event) => finish(event, false),
    },
  };
}
