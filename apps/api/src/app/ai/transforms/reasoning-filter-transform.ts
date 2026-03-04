import type { UIMessageChunk } from 'ai';

export function createReasoningFilterTransform(): TransformStream<UIMessageChunk, UIMessageChunk> {
  return new TransformStream<UIMessageChunk, UIMessageChunk>({
    transform(chunk, controller) {
      if (chunk.type === 'reasoning-start' || chunk.type === 'reasoning-end' || chunk.type === 'reasoning-delta')
        return;

      controller.enqueue(chunk);
    },
  });
}
