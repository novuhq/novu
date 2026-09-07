import { Node } from '@xyflow/react';
import { useCallback, useEffect, useRef, useState } from 'react';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

interface AnimationEntry {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

const DEFAULT_DURATION = 500;
const EMPTY_SET = new Set<string>();

export interface AnimatedNodesResult<T extends Node> {
  nodes: T[];
  animatingNodeIds: Set<string>;
}

export function useAnimatedNodes<T extends Node>(
  targetNodes: T[],
  options?: { duration?: number }
): AnimatedNodesResult<T> {
  const duration = options?.duration ?? DEFAULT_DURATION;
  const [animatedNodes, setAnimatedNodes] = useState<T[]>(targetNodes);
  const [animatingNodeIds, setAnimatingNodeIds] = useState<Set<string>>(EMPTY_SET);
  const animationRef = useRef<number | null>(null);
  const animationMapRef = useRef<Map<string, AnimationEntry>>(new Map());
  const startTimeRef = useRef<number>(0);
  const prevTargetRef = useRef<T[]>(targetNodes);
  const currentPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  for (const node of animatedNodes) {
    currentPositionsRef.current.set(node.id, { ...node.position });
  }

  const animate = useCallback(
    (timestamp: number) => {
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      const targets = prevTargetRef.current;
      const map = animationMapRef.current;

      const nextNodes = targets.map((node) => {
        const entry = map.get(node.id);
        if (!entry) return node;

        const x = entry.fromX + (entry.toX - entry.fromX) * easedProgress;
        const y = entry.fromY + (entry.toY - entry.fromY) * easedProgress;

        return { ...node, position: { x, y } };
      });

      setAnimatedNodes(nextNodes);

      for (const node of nextNodes) {
        currentPositionsRef.current.set(node.id, { ...node.position });
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
        animationMapRef.current.clear();
        setAnimatingNodeIds(EMPTY_SET);
      }
    },
    [duration]
  );

  useEffect(() => {
    const prev = prevTargetRef.current;
    prevTargetRef.current = targetNodes;

    if (prev.length === 0) {
      setAnimatedNodes(targetNodes);
      for (const node of targetNodes) {
        currentPositionsRef.current.set(node.id, { ...node.position });
      }

      return;
    }

    const targetIds = new Set(targetNodes.map((n) => n.id));

    for (const [id] of currentPositionsRef.current) {
      if (!targetIds.has(id)) {
        currentPositionsRef.current.delete(id);
      }
    }

    let hasPositionChange = false;
    const newMap = new Map<string, AnimationEntry>();

    for (const targetNode of targetNodes) {
      const currentPos = currentPositionsRef.current.get(targetNode.id);

      if (!currentPos) {
        currentPositionsRef.current.set(targetNode.id, { ...targetNode.position });
        continue;
      }

      const dx = Math.abs(currentPos.x - targetNode.position.x);
      const dy = Math.abs(currentPos.y - targetNode.position.y);

      if (dx > 0.5 || dy > 0.5) {
        hasPositionChange = true;
        newMap.set(targetNode.id, {
          fromX: currentPos.x,
          fromY: currentPos.y,
          toX: targetNode.position.x,
          toY: targetNode.position.y,
        });
      }
    }

    if (!hasPositionChange) {
      setAnimatedNodes(targetNodes);

      return;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    animationMapRef.current = newMap;
    setAnimatingNodeIds(new Set(newMap.keys()));
    startTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [targetNodes, animate]);

  return { nodes: animatedNodes, animatingNodeIds };
}
