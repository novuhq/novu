import type { UIMessageChunk } from 'ai';

type ToolOutputChunk = UIMessageChunk & {
  type: 'tool-output-available';
  toolCallId: string;
  output: string;
};

function isToolOutputChunk(chunk: UIMessageChunk): chunk is ToolOutputChunk {
  return chunk.type === 'tool-output-available';
}

/**
 * Creates a TransformStream that parses tool output JSON strings into objects.
 *
 * The `@ai-sdk/langchain` adapter's `toUIMessageStream()` emits `tool-output-available`
 * events with the `output` field as a stringified JSON. This transform parses that
 * string into an actual JSON object for better client-side consumption.
 *
 * @example
 * Before: { type: 'tool-output-available', output: '{"content":"..."}' }
 * After:  { type: 'tool-output-available', output: { content: '...' } }
 *
 * @returns A TransformStream that processes UIMessageChunk events
 */
export function createToolOutputTransform(): TransformStream<UIMessageChunk, UIMessageChunk> {
  return new TransformStream<UIMessageChunk, UIMessageChunk>({
    transform(chunk, controller) {
      if (isToolOutputChunk(chunk)) {
        try {
          const parsedOutput: unknown = JSON.parse(chunk.output);
          controller.enqueue({ ...chunk, output: parsedOutput } as UIMessageChunk);
          return;
        } catch {
          // If parsing fails, pass through unchanged
          controller.enqueue(chunk);
          return;
        }
      }

      controller.enqueue(chunk);
    },
  });
}
