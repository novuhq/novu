export const writeToolReasoningInChunks = async (
  id: string,
  toolCallId: string,
  text: string,
  writer: (chunk: unknown) => void
) => {
  const words = text.split(/(\s+)/);
  let accumulated = '';
  for (const word of words) {
    accumulated += word;
    writer?.({ id, toolCallId, type: 'reasoning', text: accumulated });
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};
