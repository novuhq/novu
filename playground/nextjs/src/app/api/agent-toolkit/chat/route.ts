import { openai } from '@ai-sdk/openai';
import { convertToModelMessages, streamText } from 'ai';
import { buildRefundTools } from '../lib/toolkit';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const tools = await buildRefundTools();

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system:
      'You are a helpful customer support agent for an e-commerce store. ' +
      'You can issue refunds on behalf of customers. ' +
      'When a refund is requested, confirm the order ID, amount, and reason before proceeding. ' +
      'After triggering a refund, the action requires human approval — inform the user.',
    messages: await convertToModelMessages(messages),
    tools,
  });

  return result.toUIMessageStreamResponse();
}
