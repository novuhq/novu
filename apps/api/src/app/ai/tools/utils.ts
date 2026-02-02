import { UIMessageStreamWriter } from 'ai';

function chunkIntoTokens(text: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < text.length) {
    const chunkSize = Math.floor(Math.random() * 2) + 3; // Random size between 3-4
    tokens.push(text.slice(i, i + chunkSize));
    i += chunkSize;
  }
  return tokens;
}

export async function writeToolReasoningInChunks({
  id,
  toolCallId,
  writer,
  text,
}: {
  id: string;
  toolCallId: string;
  writer: UIMessageStreamWriter;
  text: string;
}) {
  // Stream word by word
  const tokens = chunkIntoTokens(text);
  let result = '';
  for (const token of tokens) {
    result = `${result}${token}`;
    writer.write({
      id,
      type: 'data-tool-reasoning',
      data: { toolCallId, text: result },
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
