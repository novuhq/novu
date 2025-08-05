import { FeatureFlagsKeysEnum } from '@novu/shared';
import { cva, VariantProps } from 'class-variance-authority';
import { motion } from 'motion/react';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RiDraggable, RiErrorWarningFill } from 'react-icons/ri';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { STEP_TYPE_TO_COLOR } from '@/utils/color';
import { StepTypeEnum } from '@/utils/enums';
import { cn } from '@/utils/ui';
import { HoverCard, HoverCardContent, HoverCardPortal, HoverCardTrigger } from '../primitives/hover-card';
import { Popover, PopoverArrow, PopoverContent, PopoverPortal, PopoverTrigger } from '../primitives/popover';
import { StepPreview } from '../step-preview-hover-card';

const nodeBadgeVariants = cva(
  'min-w-5 text-xs h-5 border rounded-full opacity-40 flex items-center justify-center p-1',
  {
    variants: {
      variant: {
        neutral: 'border-neutral-500 text-neutral-500',
        feature: 'border-feature text-feature',
        information: 'border-information text-information',
        highlighted: 'border-highlighted text-highlighted',
        stable: 'border-stable text-stable',
        verified: 'border-verified text-verified',
        destructive: 'border-destructive text-destructive',
        success: 'border-success text-success',
        warning: 'border-warning text-warning',
        alert: 'border-alert text-alert',
        soft: 'border-neutral-alpha-200 text-neutral-alpha-200',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

export interface NodeIconProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof nodeBadgeVariants> {}

export const NodeIcon = ({ children, variant }: NodeIconProps) => {
  return <span className={nodeBadgeVariants({ variant })}>{children}</span>;
};

export const NodeName = ({ children }: { children: ReactNode }) => {
  return (
    <span className="text-foreground-950 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium">
      {children}
    </span>
  );
};

export const NodeHeader = ({ children, type }: { children: ReactNode; type: StepTypeEnum }) => {
  return (
    <div className="flex w-full items-center gap-1.5 px-1 py-2">
      {children}
      <div
        className={cn(
          nodeBadgeVariants({ variant: STEP_TYPE_TO_COLOR[type] as any }),
          'ml-auto min-w-max px-2 uppercase opacity-40'
        )}
      >
        {type.replace('_', '-')}
      </div>
    </div>
  );
};

export const NodeBody = ({
  children,
  type,
  controlValues,
  showPreview,
}: {
  children: ReactNode;
  type: StepTypeEnum;
  controlValues: Record<string, any>;
  showPreview?: boolean;
}) => {
  const isPreviewEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_WORKFLOW_NODE_PREVIEW_ENABLED);

  return (
    <HoverCard openDelay={300}>
      <HoverCardTrigger asChild>
        <div className="bg-neutral-alpha-50 hover-trigger pointer-events-auto relative flex items-center rounded-lg px-1 py-2">
          <span className="text-foreground-400 overflow-hidden text-ellipsis text-nowrap text-sm font-medium">
            {children}
          </span>
          <span className="to-background/90 absolute left-0 top-0 h-full w-full rounded-b-[calc(var(--radius)-1px)] bg-gradient-to-r from-[rgba(255,255,255,0.00)] from-70% to-95%" />
        </div>
      </HoverCardTrigger>
      {(isPreviewEnabled || showPreview) && (
        <HoverCardPortal container={document.getElementById('workflow-canvas-container')}>
          {type !== StepTypeEnum.TRIGGER && (
            <HoverCardContent side="left" className="border-stroke-soft bg-bg-weak w-[450px] p-1" sideOffset={15}>
              <div className="bg-bg-white flex w-full items-center justify-center rounded-lg border border-[#F2F5F8] p-1">
                <StepPreview type={type} controlValues={controlValues} />
              </div>
            </HoverCardContent>
          )}
        </HoverCardPortal>
      )}
    </HoverCard>
  );
};

export const NodeError = ({ children }: { children: ReactNode }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  return (
    <Popover open={isPopoverOpen}>
      <PopoverTrigger asChild>
        <span
          className="error-trigger pointer-events-auto absolute right-0 top-0 size-4 -translate-y-[5px] translate-x-[5px]"
          onMouseEnter={() => setIsPopoverOpen(true)}
          onMouseLeave={() => setIsPopoverOpen(false)}
        >
          <RiErrorWarningFill className="border-destructive fill-destructive bg-foreground-0 rounded-full border p-[1px]" />
        </span>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent className="flex min-w-min max-w-[200px] rounded-xl p-2" side="right">
          <PopoverArrow />
          <span className="text-destructive text-xs font-normal">{children}</span>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};

export const NODE_WIDTH = 300;
export const NODE_HEIGHT = 86;

const nodeVariants = cva(
  `relative bg-neutral-alpha-200 transition-colors aria-selected:bg-gradient-to-bl aria-selected:from-[#FFB84D] aria-selected:to-[#E300BD] [&>span]:bg-foreground-0 flex w-[300px] flex-col p-px drop-shadow-sm flex [&>span]:flex-1 [&>span]:rounded-[calc(var(--radius)-1px)] [&>span]:p-1 [&>span]:flex [&>span]:flex-col [&>span]:gap-1`,
  {
    variants: {
      variant: {
        default:
          'rounded-lg pointer-events-auto [&_span:not(.hover-trigger,.error-trigger,.action-bar-trigger)]:pointer-events-none [&_.action-bar-trigger]:pointer-events-auto',
        sm: 'text-neutral-400 w-min rounded-lg pointer-events-auto [&_span:not(.hover-trigger,.error-trigger,.action-bar-trigger)]:pointer-events-none [&_.action-bar-trigger]:pointer-events-auto',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BaseNodeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof nodeVariants> {
  pill?: ReactNode;
  onPillClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  nodeId?: string;
  isDraggable?: boolean;
  isDragHandleVisible?: boolean;
  onNodeDragStart?: (nodeId: string, position: { x: number; y: number }) => void;
  onNodeDragMove?: (position: { x: number; y: number }) => void;
  onNodeDragEnd?: () => void;
}

// Separate component for the dragged node to isolate re-renders
const DraggedNode = ({
  children,
  variant,
  className,
  initialPosition,
  clickOffset,
  onMove,
  nodeId,
}: {
  children: ReactNode;
  variant?: VariantProps<typeof nodeVariants>['variant'];
  className?: string;
  initialPosition: { x: number; y: number };
  clickOffset: { x: number; y: number };
  onMove?: (position: { x: number; y: number }) => void;
  nodeId?: string;
}) => {
  const draggedNodeRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();
  const lastPositionRef = useRef(initialPosition);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Cancel any pending animation frame
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      // Use requestAnimationFrame to throttle updates
      rafRef.current = requestAnimationFrame(() => {
        const newX = e.clientX - clickOffset.x;
        const newY = e.clientY - clickOffset.y;

        // Update transform directly for better performance
        if (draggedNodeRef.current) {
          draggedNodeRef.current.style.transform = `translate(${newX}px, ${newY}px) rotate(-4deg)`;
          draggedNodeRef.current.style.transformOrigin = 'top left';
          draggedNodeRef.current.style.transition = 'transform 0.1s ease';
        }

        // Only call onMove if position changed significantly (throttle callbacks)
        const dx = Math.abs(newX - lastPositionRef.current.x);
        const dy = Math.abs(newY - lastPositionRef.current.y);
        if ((dx > 5 || dy > 5) && onMove) {
          lastPositionRef.current = { x: newX, y: newY };
          onMove({ x: e.clientX, y: e.clientY });
        }
      });
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [clickOffset, onMove]);

  return createPortal(
    <div
      ref={draggedNodeRef}
      className={cn(
        nodeVariants({ variant, className }),
        'transition-all fixed pointer-events-none z-[9999] !cursor-grab rotate-[-4deg]'
      )}
      style={{
        left: 0,
        top: 0,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        transform: `translate(${initialPosition.x}px, ${initialPosition.y}px) rotate(0)`,
        willChange: 'transform',
        transformOrigin: 'top left',
        transition: 'transform 0.1s ease',
      }}
    >
      <div
        className="absolute top-2 -left-6 bg-background rounded-4 shadow-md size-4 flex items-center justify-center !cursor-grab"
        data-draggable-node-id={nodeId}
      >
        <RiDraggable className="size-3 text-text-soft" />
      </div>
      <span>{children}</span>
    </div>,
    document.body
  );
};

export const Node = (props: BaseNodeProps) => {
  const {
    children,
    variant,
    className,
    pill,
    onPillClick,
    nodeId,
    isDraggable = true,
    isDragHandleVisible = false,
    onNodeDragStart,
    onNodeDragMove,
    onNodeDragEnd,
    ...rest
  } = props;
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPotentialDrag, setIsPotentialDrag] = useState(false);
  const [mouseDownPosition, setMouseDownPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragInfo, setDragInfo] = useState<{
    initial: { x: number; y: number };
    offset: { x: number; y: number };
  } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggable || !nodeId) return;

      e.preventDefault();
      e.stopPropagation();

      const rect = nodeRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Calculate the offset of the click position relative to the node's top-left corner
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      const initialPosition = {
        x: e.clientX - offsetX,
        y: e.clientY - offsetY,
      };

      // Store info for potential drag but don't start dragging yet
      setIsPotentialDrag(true);
      setMouseDownPosition({ x: e.clientX, y: e.clientY });
      setDragInfo({
        initial: initialPosition,
        offset: { x: offsetX, y: offsetY },
      });
    },
    [isDraggable, nodeId]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragInfo(null);
      if (onNodeDragEnd) {
        onNodeDragEnd();
      }
    }

    // Reset potential drag state
    setIsPotentialDrag(false);
    setMouseDownPosition(null);
  }, [isDragging, onNodeDragEnd]);

  useEffect(() => {
    if (isDragging || isPotentialDrag) {
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isPotentialDrag, handleMouseUp]);

  // Monitor mouse movement after mouse down to start drag
  useEffect(() => {
    if (!isPotentialDrag || !mouseDownPosition || !onNodeDragStart) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Check if mouse has moved enough to start dragging (5px threshold)
      const dx = Math.abs(e.clientX - mouseDownPosition.x);
      const dy = Math.abs(e.clientY - mouseDownPosition.y);

      if (dx > 5 || dy > 5) {
        // Start the actual drag
        setIsDragging(true);
        setIsPotentialDrag(false);

        if (onNodeDragStart && nodeId) {
          onNodeDragStart(nodeId, { x: e.clientX, y: e.clientY });
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isPotentialDrag, mouseDownPosition, onNodeDragStart, nodeId]);

  return (
    <>
      <div
        ref={nodeRef}
        className={cn('cursor-pointer', nodeVariants({ variant, className }))}
        data-droppable-node-id={nodeId}
        {...rest}
      >
        {isDragHandleVisible && (
          <motion.div
            className="action-bar-trigger pointer-events-auto absolute top-0 -left-8 z-50 p-2"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: {
                delay: 0.6,
                ease: 'easeInOut',
              },
            }}
            exit={{
              opacity: 0,
              transition: {
                duration: 0.15,
                ease: 'easeInOut',
              },
            }}
            onMouseDown={handleMouseDown}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <div className="bg-background rounded-4 shadow-md size-4 flex items-center justify-center cursor-grab border border-neutral-200">
              <RiDraggable className="size-3 text-text-soft" />
            </div>
          </motion.div>
        )}
        {pill && (
          <div
            className="border-neutral-alpha-200 text-foreground-600 absolute left-0 top-0 flex -translate-y-full items-center gap-1 rounded-t-lg border border-b-0 bg-neutral-50 px-1.5 py-0.5 text-xs font-medium"
            onClick={onPillClick}
          >
            {pill}
          </div>
        )}
        <span>{children}</span>
      </div>
      {isDragging && dragInfo && (
        <DraggedNode
          variant={variant}
          initialPosition={dragInfo.initial}
          clickOffset={dragInfo.offset}
          onMove={onNodeDragMove}
          nodeId={nodeId}
        >
          {children}
        </DraggedNode>
      )}
    </>
  );
};
